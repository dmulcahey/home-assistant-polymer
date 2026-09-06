import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomCurrentTargetEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/buttons/ha-progress-button";
import type { HaProgressButton } from "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
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
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public device?: ZHADevice;

  @property({ attribute: false })
  public selectedCluster?: Cluster;

  @state() private _attributes: Attribute[] | undefined;

  @state() private _selectedAttributeKey?: string;

  @state() private _attributeFormData: Record<string, unknown> = {};

  @state() private _readingAttribute = false;

  protected updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("selectedCluster")) {
      this._attributes = undefined;
      this._selectedAttributeKey = undefined;
      this._attributeFormData = {};
      this._fetchAttributesForCluster();
    }
    super.updated(changedProperties);
  }

  protected render() {
    if (!this.device || !this.selectedCluster || !this._attributes) {
      return nothing;
    }
    const selectedAttribute = this._selectedAttribute;
    return html`
      <div class="content">
        <div class="attribute-picker">
          <ha-select
            .label=${this.hass!.localize(
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
          selectedAttribute
            ? this._renderAttributeInteractions(selectedAttribute)
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
    return this.hass!.localize(
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

  private _renderAttributeInteractions(attribute: Attribute): TemplateResult {
    const access = attribute.zcl_attribute.access;
    // ZCL write (0x02) and optional write (0x04) access flags.
    // eslint-disable-next-line no-bitwise
    const writable = access === null || (access & 0x06) !== 0;
    const validationError =
      this._computeAttributeValueValidationError(attribute);
    const canWrite =
      writable && this._attributeFormData.value != null && !validationError;

    return html`
      <div class="attribute-form">
        <ha-form
          .hass=${this.hass}
          .disabled=${!writable}
          .schema=${attribute.schema}
          @value-changed=${this._attributeFormDataChanged}
          .data=${this._attributeFormData}
          .computeLabel=${this._computeLabel}
          .error=${validationError ? { value: validationError } : undefined}
        ></ha-form>
        ${
          !writable
            ? html`
                <div class="attribute-hint">
                  ${this.hass!.localize(
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
          .data=${this._computeSetAttributeServiceData(attribute) ?? {}}
          .disabled=${!canWrite}
        >
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_attributes.write_zigbee_attribute"
          )}
        </ha-call-service-button>
        <ha-progress-button
          @click=${this._onGetZigbeeAttributeClick}
          .progress=${this._readingAttribute}
          .disabled=${this._readingAttribute}
        >
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_attributes.read_zigbee_attribute"
          )}
        </ha-progress-button>
      </div>
    `;
  }

  private async _fetchAttributesForCluster(): Promise<void> {
    if (this.device && this.selectedCluster && this.hass) {
      this._attributes = await fetchAttributesForCluster(
        this.hass,
        this.device.ieee,
        this.selectedCluster.endpoint_id,
        this.selectedCluster.id,
        this.selectedCluster.type
      );
      this._attributes.sort(
        (a, b) =>
          a.zcl_attribute.name.localeCompare(b.zcl_attribute.name) ||
          (a.zcl_attribute.manufacturer_code ?? -1) -
            (b.zcl_attribute.manufacturer_code ?? -1)
      );
      if (this._attributes.length > 0) {
        this._selectedAttributeKey = this._attributeKey(this._attributes[0]);
      }
    }
  }

  private _computeReadAttributeServiceData(
    attribute: Attribute
  ): ReadAttributeServiceData | undefined {
    if (!this.selectedCluster || !this.device) {
      return undefined;
    }

    return {
      ieee: this.device.ieee,
      endpoint_id: this.selectedCluster.endpoint_id,
      cluster_id: this.selectedCluster.id,
      cluster_type: this.selectedCluster.type,
      attribute: attribute.zcl_attribute.name,
      manufacturer: attribute.zcl_attribute.manufacturer_code ?? undefined,
    };
  }

  private _computeSetAttributeServiceData(
    attribute: Attribute
  ): SetAttributeServiceData | undefined {
    const data = this._computeReadAttributeServiceData(attribute);
    return data ? { ...data, value: this._attributeFormData.value } : undefined;
  }

  private _attributeFormDataChanged(
    ev: ValueChangedEvent<Record<string, unknown>>
  ): void {
    this._attributeFormData = ev.detail.value;
  }

  private _computeLabel = (schema: HaFormSchema): string =>
    schema.name === "value"
      ? this.hass!.localize("ui.panel.config.zha.common.value")
      : schema.name;

  private _computeAttributeValueValidationError(
    attribute: Attribute
  ): string | undefined {
    const fixedLength = attribute.fixed_length;
    const value = this._attributeFormData.value;
    if (
      value === undefined ||
      fixedLength === undefined ||
      (Array.isArray(value) && value.length === fixedLength)
    ) {
      return undefined;
    }
    return this.hass!.localize(
      "ui.panel.config.zha.cluster_attributes.fixed_length_error",
      { count: fixedLength }
    );
  }

  private async _onGetZigbeeAttributeClick(
    ev: HASSDomCurrentTargetEvent<HaProgressButton>
  ): Promise<void> {
    const attribute = this._selectedAttribute;
    const data = attribute && this._computeReadAttributeServiceData(attribute);
    if (!data || !this.hass || this._readingAttribute) {
      return;
    }
    const button = ev.currentTarget;
    this._readingAttribute = true;
    try {
      const value = await readAttributeValue(this.hass, data);
      this._attributeFormData = value !== null ? { value } : {};
      forwardHaptic(this, "success");
      button.actionSuccess();
    } catch (_err) {
      forwardHaptic(this, "failure");
      button.actionError();
    } finally {
      this._readingAttribute = false;
    }
  }

  private _selectedAttributeChanged(event: HaSelectSelectEvent): void {
    if (this._selectedAttributeKey === event.detail.value) {
      return;
    }
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
          padding-bottom: 10px;
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
