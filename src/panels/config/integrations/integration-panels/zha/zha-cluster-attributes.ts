import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomCurrentTargetEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/buttons/ha-progress-button";
import type { HaProgressButton } from "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import "../../../../../components/ha-spinner";
import { forwardHaptic } from "../../../../../data/haptics";
import type {
  Attribute,
  Cluster,
  ReadAttributeServiceData,
  ZHADevice,
} from "../../../../../data/zha";
import {
  fetchAttributesForCluster,
  readAttributeValue,
} from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../../types";
import { formatAsPaddedHex } from "./functions";
import type { SetAttributeServiceData } from "./types";

@customElement("zha-cluster-attributes")
export class ZHAClusterAttributes extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device?: ZHADevice;

  @property({ attribute: false })
  public selectedCluster?: Cluster;

  @state() private _attributes: Attribute[] | undefined;

  @state() private _selectedAttributeKey?: string;

  @state() private _attributeFormData: Record<string, unknown> = {};

  @state() private _readingAttribute = false;

  private _readRequestId = 0;

  @state() private _loadError = false;

  private _loadRequestId = 0;

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    const deviceChanged =
      changedProperties.has("device") &&
      this.device?.ieee !== changedProperties.get("device")?.ieee;
    if (changedProperties.has("selectedCluster") || deviceChanged) {
      this._readRequestId++;
      this._readingAttribute = false;
      this._attributes = undefined;
      this._selectedAttributeKey = undefined;
      this._attributeFormData = {};
      this._loadError = false;
      this._fetchAttributesForCluster();
    }
  }

  protected render() {
    if (!this.hass || !this.device || !this.selectedCluster) {
      return nothing;
    }
    if (this._loadError) {
      return html`<ha-alert alert-type="error">
        ${this.hass.localize("ui.panel.config.zha.cluster_attributes.load_failed")}
      </ha-alert>`;
    }
    if (!this._attributes) {
      return html`<ha-spinner></ha-spinner>`;
    }
    return html`
      <div class="content">
        <div class="attribute-picker">
          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.zha.cluster_attributes.attributes_of_cluster"
            )}
            class="menu"
            .value=${this._selectedAttributeKey}
            @selected=${this._selectedAttributeChanged}
            .options=${this._attributes.map((entry) => ({
              value: this._attributeKey(entry),
              label: this._formatAttributeLabel(entry),
            }))}
          >
          </ha-select>
        </div>
        ${
          this._selectedAttributeKey !== undefined
            ? this._renderAttributeInteractions()
            : nothing
        }
      </div>
    `;
  }

  private _attributeKey(attribute: Attribute): string {
    return JSON.stringify([
      attribute.zcl_attribute.id,
      attribute.zcl_attribute.name,
      attribute.zcl_attribute.manufacturer_code ?? null,
    ]);
  }

  private _formatAttributeLabel(attribute: Attribute): string {
    const { name, id, manufacturer_code } = attribute.zcl_attribute;
    return this.hass.localize(
      manufacturer_code == null
        ? "ui.panel.config.zha.cluster_attributes.attribute_label"
        : "ui.panel.config.zha.cluster_attributes.manufacturer_attribute_label",
      {
        name,
        id: formatAsPaddedHex(id),
        manufacturer:
          manufacturer_code == null ? "" : formatAsPaddedHex(manufacturer_code),
      }
    );
  }

  private get _selectedAttribute(): Attribute | undefined {
    return this._attributes?.find(
      (attr) => this._attributeKey(attr) === this._selectedAttributeKey
    );
  }

  private get _selectedAttributeIsWritable(): boolean {
    const access = this._selectedAttribute?.zcl_attribute.access;
    if (access == null || !Number.isFinite(Number(access))) {
      return true;
    }
    // ZCL write (0x02) and optional write (0x04) access flags.
    // eslint-disable-next-line no-bitwise
    return (Number(access) & 0x06) !== 0;
  }

  private get _attributeValueValidationError(): string | undefined {
    if (this._attributeFormData.value === undefined) {
      return undefined;
    }
    return this._computeAttributeValueValidationError(
      this._attributeFormData.value
    );
  }

  private get _setAttributeServiceData(): SetAttributeServiceData | undefined {
    const data = this._computeReadAttributeServiceData();
    if (
      !data ||
      this._attributeFormData.value === undefined ||
      this._attributeFormData.value === null ||
      !this._selectedAttributeIsWritable ||
      this._attributeValueValidationError
    ) {
      return undefined;
    }
    return { ...data, value: this._attributeFormData.value };
  }

  private _renderAttributeInteractions(): TemplateResult {
    const setAttributeServiceData = this._setAttributeServiceData;
    const readAttributeServiceData = this._computeReadAttributeServiceData();
    const validationError = this._attributeValueValidationError;

    return html`
      <div class="attribute-form">
        <ha-form
          .hass=${this.hass}
          .disabled=${!this._selectedAttributeIsWritable}
          .schema=${this._selectedAttribute?.schema ?? []}
          @value-changed=${this._attributeFormDataChanged}
          .data=${this._attributeFormData}
          .computeLabel=${this._computeLabel}
          .error=${validationError ? { value: validationError } : undefined}
        ></ha-form>
        ${
          !this._selectedAttributeIsWritable
            ? html`
                <div class="attribute-hint">
                  ${this.hass.localize(
                    "ui.panel.config.zha.cluster_attributes.read_only_attribute_hint"
                  )}
                </div>
              `
            : nothing
        }
      </div>
      <div class="card-actions">
        <ha-call-service-button
          domain="zha"
          service="set_zigbee_cluster_attribute"
          .data=${setAttributeServiceData ?? {}}
          .disabled=${!setAttributeServiceData}
        >
          ${this.hass.localize(
            "ui.panel.config.zha.cluster_attributes.write_zigbee_attribute"
          )}
        </ha-call-service-button>
        <ha-progress-button
          @click=${this._onGetZigbeeAttributeClick}
          .progress=${this._readingAttribute}
          .disabled=${this._readingAttribute || !readAttributeServiceData}
        >
          ${this.hass.localize(
            "ui.panel.config.zha.cluster_attributes.read_zigbee_attribute"
          )}
        </ha-progress-button>
      </div>
    `;
  }

  private async _fetchAttributesForCluster(): Promise<void> {
    const requestId = ++this._loadRequestId;
    const device = this.device;
    const selectedCluster = this.selectedCluster;
    const hass = this.hass;
    if (!device || !selectedCluster || !hass) {
      return;
    }

    try {
      const attributes = await fetchAttributesForCluster(
        hass,
        device.ieee,
        selectedCluster.endpoint_id,
        selectedCluster.id,
        selectedCluster.type
      );
      if (
        requestId !== this._loadRequestId ||
        this.selectedCluster !== selectedCluster ||
        this.device?.ieee !== device.ieee
      ) {
        return;
      }
      attributes.sort((a, b) => {
        const nameComparison = a.zcl_attribute.name.localeCompare(
          b.zcl_attribute.name
        );
        if (nameComparison !== 0) {
          return nameComparison;
        }
        return (
          (a.zcl_attribute.manufacturer_code ?? -1) -
          (b.zcl_attribute.manufacturer_code ?? -1)
        );
      });
      this._attributes = attributes;
      if (attributes.length > 0) {
        this._selectedAttributeKey = this._attributeKey(this._attributes[0]);
        this._attributeFormData = {};
      }
    } catch (_err) {
      if (
        requestId === this._loadRequestId &&
        this.selectedCluster === selectedCluster &&
        this.device?.ieee === device.ieee
      ) {
        this._loadError = true;
      }
    }
  }

  private _computeReadAttributeServiceData():
    ReadAttributeServiceData | undefined {
    const cluster = this.selectedCluster;
    const device = this.device;
    const selectedAttribute = this._selectedAttribute;
    if (!cluster || !device || !selectedAttribute) {
      return undefined;
    }

    return {
      ieee: device.ieee,
      endpoint_id: cluster.endpoint_id,
      cluster_id: cluster.id,
      cluster_type: cluster.type,
      attribute: selectedAttribute.zcl_attribute.name,
      manufacturer:
        selectedAttribute.zcl_attribute.manufacturer_code ?? undefined,
    };
  }

  private _attributeFormDataChanged(
    ev: ValueChangedEvent<Record<string, unknown>>
  ): void {
    this._attributeFormData = ev.detail.value;
  }

  private _computeLabel = (schema: HaFormSchema): string =>
    schema.name === "value"
      ? this.hass.localize("ui.panel.config.zha.common.value")
      : schema.name;

  private _computeAttributeValueValidationError(
    value: unknown
  ): string | undefined {
    const fixedLength = this._selectedAttribute?.fixed_length;
    if (
      fixedLength === undefined ||
      (Array.isArray(value) && value.length === fixedLength)
    ) {
      return undefined;
    }
    return this.hass.localize(
      "ui.panel.config.zha.cluster_attributes.fixed_length_error",
      { count: fixedLength }
    );
  }

  private async _onGetZigbeeAttributeClick(
    ev: HASSDomCurrentTargetEvent<HaProgressButton>
  ): Promise<void> {
    const data = this._computeReadAttributeServiceData();
    if (!data || this._readingAttribute) {
      return;
    }
    const button = ev.currentTarget;
    const requestId = ++this._readRequestId;
    const cluster = this.selectedCluster;
    this._readingAttribute = true;
    try {
      const value = await readAttributeValue(this.hass, data);
      if (
        requestId !== this._readRequestId ||
        this.selectedCluster !== cluster ||
        this.device?.ieee !== data.ieee
      ) {
        return;
      }
      this._attributeFormData = value !== null ? { value } : {};
      forwardHaptic(this, "success");
      button.actionSuccess();
    } catch (_err) {
      if (requestId === this._readRequestId) {
        forwardHaptic(this, "failure");
        button.actionError();
      }
    } finally {
      if (requestId === this._readRequestId) {
        this._readingAttribute = false;
      }
    }
  }

  private _selectedAttributeChanged(event: HaSelectSelectEvent): void {
    if (this._selectedAttributeKey === event.detail.value) {
      return;
    }
    this._readRequestId++;
    this._readingAttribute = false;
    this._selectedAttributeKey = event.detail.value;
    this._attributeFormData = {};
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }

        ha-spinner {
          display: block;
          margin: var(--ha-space-4) auto;
        }

        .content {
          padding-top: var(--ha-space-4);
        }

        ha-select {
          margin-top: var(--ha-space-4);
        }

        .menu {
          width: 100%;
        }

        .attribute-picker,
        .attribute-form {
          padding-inline: var(--ha-space-7);
          padding-bottom: var(--ha-space-3);
        }

        .attribute-hint {
          color: var(--secondary-text-color);
          margin-top: var(--ha-space-2);
        }

        .card-actions {
          display: flex;
          border-top: 1px solid var(--divider-color);
          padding: var(--ha-space-2);
          justify-content: flex-end;
          gap: var(--ha-space-2);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster-attributes": ZHAClusterAttributes;
  }
}
