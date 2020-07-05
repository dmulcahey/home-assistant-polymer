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

@customElement("zha-config-network")
class ZHAConfigNetwork extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public configuration: any = {};

  protected render(): TemplateResult {
    return html`
      <ha-card header="Network Configuration">
        <div class="card-content">
          <ha-form
            .data=${this.configuration.data}
            .schema=${this.configuration.schema}
          ></ha-form>
        </div>
      </ha-card>
    `;
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
    "zha-config-network": ZHAConfigNetwork;
  }
}
