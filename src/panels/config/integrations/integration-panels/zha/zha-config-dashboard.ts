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
import type { HaFormSchema } from "../../../../../components/ha-form/ha-form";

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

export const schema: HaFormSchema = [
  {
    type: "integer",
    valueMin: 8,
    valueMax: 16,
    name: "CONFIG_NEIGHBOR_TABLE_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 255,
    name: "CONFIG_APS_UNICAST_MESSAGE_COUNT",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 127,
    name: "CONFIG_BINDING_TABLE_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    name: "CONFIG_ADDRESS_TABLE_SIZE",
    optional: true,
    default: 16,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 255,
    name: "CONFIG_MULTICAST_TABLE_SIZE",
    optional: true,
    default: 16,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 255,
    name: "CONFIG_ROUTE_TABLE_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 255,
    name: "CONFIG_DISCOVERY_TABLE_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 16,
    name: "CONFIG_BROADCAST_ALARM_DATA_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 16,
    name: "CONFIG_UNICAST_ALARM_DATA_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 255,
    name: "CONFIG_STACK_PROFILE",
    optional: true,
    default: 2,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 5,
    name: "CONFIG_SECURITY_LEVEL",
    optional: true,
    default: 5,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 30,
    name: "CONFIG_MAX_HOPS",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 32,
    name: "CONFIG_MAX_END_DEVICE_CHILDREN",
    optional: true,
    default: 24,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 30000,
    name: "CONFIG_INDIRECT_TRANSMISSION_TIMEOUT",
    optional: true,
    default: 7680,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 14,
    name: "CONFIG_END_DEVICE_POLL_TIMEOUT",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    name: "CONFIG_MOBILE_NODE_POLL_TIMEOUT",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 254,
    name: "CONFIG_RESERVED_MOBILE_CHILD_ENTRIES",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 3,
    name: "CONFIG_TX_POWER_MODE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 1,
    name: "CONFIG_DISABLE_RELAY",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    name: "CONFIG_TRUST_CENTER_ADDRESS_CACHE_SIZE",
    optional: true,
    default: 2,
  },
  {
    type: "integer",
    valueMin: 0,
    name: "CONFIG_SOURCE_ROUTE_TABLE_SIZE",
    optional: true,
    default: 16,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 8,
    name: "CONFIG_FRAGMENT_WINDOW_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    name: "CONFIG_FRAGMENT_DELAY_MS",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    name: "CONFIG_KEY_TABLE_SIZE",
    optional: true,
    default: 4,
  },
  {
    type: "integer",
    valueMin: 0,
    name: "CONFIG_APS_ACK_TIMEOUT",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 6,
    name: "CONFIG_ACTIVE_SCAN_DURATION",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 1,
    name: "CONFIG_END_DEVICE_BIND_TIMEOUT",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 1,
    valueMax: 63,
    name: "CONFIG_PAN_ID_CONFLICT_REPORT_THRESHOLD",
    optional: true,
    default: 2,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 10,
    name: "CONFIG_REQUEST_KEY_TIMEOUT",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 1,
    name: "CONFIG_CERTIFICATE_TABLE_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 255,
    name: "CONFIG_APPLICATION_ZDO_FLAGS",
    optional: true,
    default: 3,
  },
  {
    type: "integer",
    valueMin: 15,
    valueMax: 254,
    name: "CONFIG_BROADCAST_TABLE_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 254,
    name: "CONFIG_MAC_FILTER_TABLE_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 1,
    valueMax: 2,
    name: "CONFIG_SUPPORTED_NETWORKS",
    optional: true,
    default: 1,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 1,
    name: "CONFIG_SEND_MULTICASTS_TO_SLEEPY_ADDRESS",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 255,
    name: "CONFIG_ZLL_GROUP_ADDRESSES",
    optional: true,
  },
  {
    type: "integer",
    valueMin: -128,
    valueMax: 127,
    name: "CONFIG_ZLL_RSSI_THRESHOLD",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 126,
    name: "CONFIG_RF4CE_PAIRING_TABLE_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 16,
    name: "CONFIG_RF4CE_PENDING_OUTGOING_PACKET_TABLE_SIZE",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 1,
    name: "CONFIG_MTORR_FLOW_CONTROL",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 0,
    valueMax: 65535,
    name: "CONFIG_TRANSIENT_KEY_TIMEOUT_S",
    optional: true,
  },
  {
    type: "integer",
    valueMin: 1,
    valueMax: 255,
    name: "CONFIG_PACKET_BUFFER_COUNT",
    optional: true,
    default: 255,
  },
];

@customElement("zha-config-dashboard")
class ZHAConfigDashboard extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${zhaTabs}
        back-path="/config/integrations"
      >
        <ha-card header="Zigbee Network">
          <div class="card-content">
            In the future you can change network settings for ZHA here.
          </div>
          <div class="card-content">
            <ha-form .schema=${schema}></ha-form>
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
