import "@material/mwc-list/mwc-list-item";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-select";
import "../../../../../components/buttons/ha-progress-button";
import {
  Attribute,
  Cluster,
  fetchAttributesForCluster,
  ReadAttributeServiceData,
  readAttributeValue,
  ZHADevice,
} from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { forwardHaptic } from "../../../../../data/haptics";
import { formatAsPaddedHex } from "./functions";
import {
  ChangeEvent,
  ItemSelectedEvent,
  SetAttributeServiceData,
} from "./types";
import { HaFormSchema } from "../../../../../components/ha-form/types";
import { HaForm } from "../../../../../components/ha-form/ha-form";

@customElement("zha-cluster-attributes")
export class ZHAClusterAttributes extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public device?: ZHADevice;

  @property() public selectedCluster?: Cluster;

  @state() private _attributes: Attribute[] | undefined;

  @state() private _selectedAttributeId?: number;

  @state() private _attributeValue?: any = "";

  @state() private _manufacturerCodeOverride?: string | number;

  @state() private _readingAttribute = false;

  @state()
  private _setAttributeServiceData?: SetAttributeServiceData;

  @state() private _selectedAttribute?: Attribute;

  @state()
  private _attributeData: Record<string, any> = {};

  @query("ha-form", true)
  private _attributeForm!: HaForm;

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedCluster")) {
      this._attributes = undefined;
      this._selectedAttributeId = undefined;
      this._selectedAttribute = undefined;
      this._attributeValue = "";
      this._fetchAttributesForCluster();
    }
    super.updated(changedProperties);
  }

  protected render(): TemplateResult {
    if (!this.device || !this.selectedCluster || !this._attributes) {
      return html``;
    }
    return html`
      <ha-card class="content">
        <div class="attribute-picker">
          <ha-select
            .label=${this.hass!.localize(
              "ui.panel.config.zha.cluster_attributes.attributes_of_cluster"
            )}
            class="menu"
            .value=${String(this._selectedAttributeId)}
            @selected=${this._selectedAttributeChanged}
            @closed=${stopPropagation}
            fixedMenuPosition
            naturalMenuWidth
          >
            ${this._attributes.map(
              (entry) => html`
                <mwc-list-item .value=${String(entry.id)}>
                  ${`${entry.name} (id: ${formatAsPaddedHex(entry.id)})`}
                </mwc-list-item>
              `
            )}
          </ha-select>
        </div>
        ${this._selectedAttributeId !== undefined
          ? this._renderAttributeInteractions()
          : ""}
      </ha-card>
    `;
  }

  private _renderAttributeInteractions(): TemplateResult {
    return html`
      <div class="input-text">
        <div class="command-form">
          <ha-form
            .hass=${this.hass}
            .schema=${this._selectedAttribute!.schema}
            @value-changed=${this._onAttributeValueChanged}
            .data=${this._attributeData}
            .disabled=${this._readingAttribute ||
            this._selectedAttribute!.access.indexOf("Write") === -1}
            .editMode=${true}
            .computeLabel=${this._computeLabelCallback}
          ></ha-form>
        </div>
      </div>
      <div class="input-text">
        <paper-input
          label=${this.hass!.localize(
            "ui.panel.config.zha.common.manufacturer_code_override"
          )}
          type="number"
          .value=${this._manufacturerCodeOverride}
          @value-changed=${this._onManufacturerCodeOverrideChanged}
          placeholder=${this.hass!.localize("ui.panel.config.zha.common.value")}
        ></paper-input>
      </div>
      <div class="card-actions">
        <ha-progress-button
          @click=${this._onGetZigbeeAttributeClick}
          .progress=${this._readingAttribute}
          .disabled=${this._readingAttribute}
        >
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_attributes.read_zigbee_attribute"
          )}
        </ha-progress-button>
        <ha-call-service-button
          .hass=${this.hass}
          domain="zha"
          service="set_zigbee_cluster_attribute"
          .serviceData=${this._setAttributeServiceData}
          .disabled=${this._selectedAttribute!.access.indexOf("Write") === -1}
        >
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_attributes.write_zigbee_attribute"
          )}
        </ha-call-service-button>
      </div>
    `;
  }

  private _computeLabelCallback = (_: HaFormSchema): string => "";

  private async _fetchAttributesForCluster(): Promise<void> {
    if (this.device && this.selectedCluster && this.hass) {
      this._attributes = await fetchAttributesForCluster(
        this.hass,
        this.device!.ieee,
        this.selectedCluster!.endpoint_id,
        this.selectedCluster!.id,
        this.selectedCluster!.type
      );
      this._attributes.sort((a, b) => a.name.localeCompare(b.name));
      if (this._attributes.length > 0) {
        this._selectedAttributeId = this._attributes[0].id;
        this._selectedAttribute = this._attributes[0];
      }
    }
  }

  private _computeReadAttributeServiceData():
    | ReadAttributeServiceData
    | undefined {
    if (!this.selectedCluster || !this.device) {
      return undefined;
    }
    return {
      ieee: this.device!.ieee,
      endpoint_id: this.selectedCluster!.endpoint_id,
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
      attribute: this._selectedAttributeId!,
      manufacturer: this._manufacturerCodeOverride
        ? parseInt(this._manufacturerCodeOverride as string, 10)
        : undefined,
    };
  }

  private _computeSetAttributeServiceData():
    | SetAttributeServiceData
    | undefined {
    if (!this.selectedCluster || !this.device) {
      return undefined;
    }
    return {
      ieee: this.device!.ieee,
      endpoint_id: this.selectedCluster!.endpoint_id,
      cluster_id: this.selectedCluster!.id,
      cluster_type: this.selectedCluster!.type,
      attribute: this._selectedAttributeId!,
      value: this._attributeValue,
      manufacturer: this._manufacturerCodeOverride
        ? parseInt(this._manufacturerCodeOverride as string, 10)
        : undefined,
    };
  }

  private _onAttributeValueChanged(ev: CustomEvent): void {
    this._attributeData = ev.detail.value;
    this._attributeValue = this._attributeData[this._selectedAttribute!.name];
    this._setAttributeServiceData = this._computeSetAttributeServiceData();
  }

  private _onManufacturerCodeOverrideChanged(value: ChangeEvent): void {
    this._manufacturerCodeOverride = value.detail!.value;
    this._setAttributeServiceData = this._computeSetAttributeServiceData();
  }

  private async _onGetZigbeeAttributeClick(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    const data = this._computeReadAttributeServiceData();
    if (data && this.hass) {
      this._readingAttribute = true;
      try {
        this._attributeValue = await readAttributeValue(this.hass, data);
        this._attributeData[this._selectedAttribute!.name] =
          this._attributeValue;
        // this makes the disabled form update with the new value
        if (this._selectedAttribute!.access.indexOf("Write") === -1) {
          this._attributeForm.requestUpdate();
        }
        forwardHaptic("success");
        button.actionSuccess();
      } catch (err: any) {
        forwardHaptic("failure");
        button.actionError();
      } finally {
        this._readingAttribute = false;
      }
    }
  }

  private _selectedAttributeChanged(event: ItemSelectedEvent): void {
    this._selectedAttributeId = Number(event.target!.value);
    this._selectedAttribute = this._attributes!.find(
      (attribute) => attribute.id === this._selectedAttributeId
    );
    this._attributeValue = "";
    this._attributeData = {};
    this._attributeData[this._selectedAttribute!.name] = this._attributeValue;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-select {
          margin-top: 16px;
        }

        .menu {
          width: 100%;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--error-color);
        }

        .attribute-picker {
          align-items: center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .input-text {
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }

        .header {
          flex-grow: 1;
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
