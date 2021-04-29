import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  html,
  property,
  customElement,
  LitElement,
  CSSResultArray,
  query,
} from "lit-element";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import {
  LOG_OUTPUT,
  viewZHALogs,
  ZHAGatewayLogMessage,
} from "../../../../../data/zha";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { HomeAssistant, Route } from "../../../../../types";
import { zhaTabs } from "./zha-config-dashboard";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";

@customElement("zha-logs-page")
class ZHALogsPage extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @query("textarea", true) private _textarea?: HTMLTextAreaElement;

  public hassSubscribe(): Array<UnsubscribeFunc | Promise<UnsubscribeFunc>> {
    return [
      viewZHALogs(this.hass, (message: ZHAGatewayLogMessage) => {
        if (!this.hasUpdated) {
          return;
        }
        if (message.type === LOG_OUTPUT) {
          this._textarea!.value += `${message.log_entry.message}\n`;
        }
      }),
    ];
  }

  protected render() {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${zhaTabs}
      >
        <div class="container">
          <ha-card>
            <div class="card-header">
              <h1>
                ${this.hass.localize("ui.panel.config.zha.logs_page.title")}
              </h1>
            </div>
          </ha-card>
          <textarea readonly></textarea>
        </div>
      </hass-tabs-subpage>
    `;
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .container {
          display: flex;
          flex-direction: column;
          height: 100%;
          box-sizing: border-box;
          padding: 16px;
        }
        textarea {
          flex-grow: 1;
          padding: 16px;
        }
        ha-card {
          margin: 16px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-logs-page": ZHALogsPage;
  }
}
