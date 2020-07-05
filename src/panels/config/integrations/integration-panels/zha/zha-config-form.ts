import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../../components/ha-card";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-form/ha-form";

@customElement("zha-config-form")
class ZHAConfigForm extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property() public title = "";

  @property() public section = "";

  @property({ type: Object }) public configuration: any = {};

  @property({ type: Object }) private _data: any;

  protected render(): TemplateResult {
    const data = this._dataProcessed;
    const allRequiredInfoFilledIn =
      this._data === undefined
        ? // If no data filled in, just check that any field is required
          this.configuration.schema.find((field) => !field.optional) ===
          undefined
        : // If data is filled in, make sure all required fields are
          this._data &&
          this.configuration.schema &&
          this.configuration.schema.every(
            (field) =>
              field.optional ||
              !["", undefined].includes(this._data![field.name])
          );
    return html`
      <ha-card header=${this.title}>
        <div class="card-content">
          <ha-form
            .data=${data}
            .schema=${this.configuration.schema}
            @value-changed=${this._dataChanged}
            .computeLabel=${this._computeLabelCallback(
              this.hass.localize,
              this.section
            )}
          ></ha-form>
        </div>
      </ha-card>
    `;
  }

  private _computeLabelCallback(localize, section) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      localize(
        `ui.panel.config.zha.configuration.${section}.labels.${schema.name}`
      ) || schema.name;
  }

  private _dataChanged(ev: CustomEvent) {
    this._data = ev.detail.value;
  }

  private get _dataProcessed() {
    if (this._data !== undefined) {
      return this._data;
    }

    const data = {};
    this.configuration.schema.forEach((field) => {
      if (field.name in this.configuration.data) {
        data[field.name] = this.configuration.data[field.name];
      } else if ("default" in field) {
        data[field.name] = field.default;
      }
    });

    this._data = data;
    return data;
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        ha-card {
          margin: auto;
          margin-top: 16px;
          max-width: 500px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-config-form": ZHAConfigForm;
  }
}
