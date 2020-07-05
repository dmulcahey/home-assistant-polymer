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
    return html`
      <ha-card header=${this.title}>
        <div class="card-content">
          <ha-form
            .data=${this.configuration.data}
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
