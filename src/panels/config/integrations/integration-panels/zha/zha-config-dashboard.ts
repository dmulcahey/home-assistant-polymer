import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@material/mwc-fab";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  PropertyValues,
} from "lit-element";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { mdiNetwork, mdiFolderMultipleOutline, mdiPlus } from "@mdi/js";
import "../../../../../layouts/hass-tabs-subpage";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { computeRTL } from "../../../../../common/util/compute_rtl";
import "@material/mwc-button/mwc-button";
import "../../../../../components/ha-form/ha-form";
import { fetchZHAConfiguration } from "../../../../../data/zha";

export const zhaTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.zha.network.caption",
    path: `/config/zha/dashboard`,
    iconPath: mdiNetwork,
  },
  {
    translationKey: "ui.panel.config.zha.groups.caption",
    path: `/config/zha/groups`,
    iconPath: mdiFolderMultipleOutline,
  },
];

@customElement("zha-config-dashboard")
class ZHAConfigDashboard extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() private _configuration?: any;

  private _firstUpdatedCalled = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this._fetchConfiguration();
    }
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchConfiguration();
    }
    this._firstUpdatedCalled = true;
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${zhaTabs}
        back-path="/config/integrations"
      >
        <ha-card header="Zigbee Coordinator Configuration">
          <div class="card-content">
            ${this._configuration
              ? html`
                  <ha-form
                    .data=${this._configuration.device.data}
                    .schema=${this._configuration.device.schema}
                  ></ha-form>
                `
              : ""}
          </div>
          ${this.configEntryId
            ? html`<div class="card-actions">
                <a
                  href="${`/config/devices/dashboard?historyBack=1&config_entry=${this.configEntryId}`}"
                >
                  <mwc-button
                    >${this.hass.localize(
                      "ui.panel.config.devices.caption"
                    )}</mwc-button
                  >
                </a>
                <a
                  href="${`/config/entities/dashboard?historyBack=1&config_entry=${this.configEntryId}`}"
                >
                  <mwc-button
                    >${this.hass.localize(
                      "ui.panel.config.entities.caption"
                    )}</mwc-button
                  >
                </a>
              </div>`
            : ""}
        </ha-card>
        ${this._configuration
          ? html`
              <ha-card header="Zigbee OTA Configuration">
                <div class="card-content">
                  <ha-form
                    .data=${this._configuration.ota.data}
                    .schema=${this._configuration.ota.schema}
                  ></ha-form>
                </div>
              </ha-card>
              ${this.hass.userData?.showAdvanced
                ? html`
                    <ha-card header="Zigbee Network Configuration">
                      <div class="card-content">
                        <ha-form
                          .data=${this._configuration.network.data}
                          .schema=${this._configuration.network.schema}
                        ></ha-form>
                      </div>
                    </ha-card>
                  `
                : ""}
            `
          : ""}
        ${this._configuration &&
        this._configuration.ezsp_config &&
        this.hass.userData?.showAdvanced
          ? html`
              <ha-card header="Zigbee Radio Configuration">
                <div class="card-content">
                  <ha-form
                    .data=${this._configuration.ezsp_config.data}
                    .schema=${this._configuration.ezsp_config.schema}
                  ></ha-form>
                </div>
              </ha-card>
            `
          : ""}
        <a href="/config/zha/add" slot="fab">
          <mwc-fab
            title=${this.hass.localize("ui.panel.config.zha.add_device")}
            ?rtl=${computeRTL(this.hass)}
          >
            <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
          </mwc-fab>
        </a>
      </hass-tabs-subpage>
    `;
  }

  private async _fetchConfiguration(): Promise<any> {
    this._configuration = await fetchZHAConfiguration(this.hass!);
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
    "zha-config-dashboard": ZHAConfigDashboard;
  }
}
