import { mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../../components/ha-code-editor";
import { ClusterConfigurationStatus } from "../../../../../data/zha";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";

@customElement("zha-cluster-configuration-status")
class ZHAClusterConfigurationStatus extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public clusterConfigurationStatuses?: Map<
    number,
    ClusterConfigurationStatus
  > = new Map();

  protected render(): TemplateResult {
    if (!this.clusterConfigurationStatuses) {
      return html``;
    }

    return html`
      <div class="wrapper">
        <h2 class="grid-item">
          ${this.hass.localize(
            `ui.dialogs.zha_reconfigure_device.cluster_header`
          )}
        </h2>
        <h2 class="grid-item">
          ${this.hass.localize(`ui.dialogs.zha_reconfigure_device.bind_header`)}
        </h2>
        <h2 class="grid-item">
          ${this.hass.localize(
            `ui.dialogs.zha_reconfigure_device.reporting_header`
          )}
        </h2>

        ${this.clusterConfigurationStatuses?.size
          ? html`
              ${Array.from(this.clusterConfigurationStatuses.values()).map(
                (clusterStatus) => html`
                  <div class="grid-item">${clusterStatus.cluster.name}</div>
                  <div class="grid-item">
                    ${clusterStatus.bindSuccess !== undefined
                      ? clusterStatus.bindSuccess
                        ? html`
                            <span class="stage">
                              <ha-svg-icon
                                .path=${mdiCheckCircle}
                                class="success"
                              ></ha-svg-icon>
                            </span>
                          `
                        : html`
                            <span class="stage">
                              <ha-svg-icon
                                .path=${mdiCloseCircle}
                                class="failed"
                              ></ha-svg-icon>
                            </span>
                          `
                      : ""}
                  </div>
                  <div class="grid-item">
                    ${clusterStatus.attributes.size > 0
                      ? html`
                          <div class="attributes">
                            <div class="grid-item">
                              ${this.hass.localize(
                                `ui.dialogs.zha_reconfigure_device.attribute`
                              )}
                            </div>
                            <div class="grid-item">
                              <div>
                                ${this.hass.localize(
                                  `ui.dialogs.zha_reconfigure_device.min_max_change`
                                )}
                              </div>
                            </div>
                            ${Array.from(clusterStatus.attributes.values()).map(
                              (attribute) => html`
                                <span class="grid-item">
                                  ${attribute.name}:
                                  ${attribute.success
                                    ? html`
                                        <span class="stage">
                                          <ha-svg-icon
                                            .path=${mdiCheckCircle}
                                            class="success"
                                          ></ha-svg-icon>
                                        </span>
                                      `
                                    : html`
                                        <span class="stage">
                                          <ha-svg-icon
                                            .path=${mdiCloseCircle}
                                            class="failed"
                                          ></ha-svg-icon>
                                        </span>
                                      `}
                                </span>
                                <div class="grid-item">
                                  ${attribute.min}/${attribute.max}/${attribute.change}
                                </div>
                              `
                            )}
                          </div>
                        `
                      : ""}
                  </div>
                `
              )}
            `
          : ""}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .wrapper {
          display: grid;
          grid-template-columns: 3fr 1fr 2fr;
        }
        .attributes {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .grid-item {
          border: 1px solid;
          padding: 7px;
        }
        .success {
          color: var(--success-color);
        }

        .failed {
          color: var(--warning-color);
        }

        .stage ha-svg-icon {
          width: 16px;
          height: 16px;
        }
        .stage {
          padding: 8px;
        }

        ha-svg-icon {
          width: 68px;
          height: 48px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster-configuration-status": ZHAClusterConfigurationStatus;
  }
}
