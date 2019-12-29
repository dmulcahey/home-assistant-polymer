import "../../../layouts/hass-subpage";
import "../../../components/ha-paper-icon-button-arrow-prev";
import "./zha-device-binding";
import "./zha-group-binding";
import "./zha-cluster-attributes";
import "./zha-cluster-commands";
import "./zha-clusters";
import "./zha-node";
import "@polymer/paper-icon-button/paper-icon-button";

import {
  CSSResult,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  customElement,
  css,
} from "lit-element";

import { HASSDomEvent } from "../../../common/dom/fire_event";
import {
  Cluster,
  fetchBindableDevices,
  ZHADevice,
  fetchGroups,
  ZHAGroup,
} from "../../../data/zha";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { sortZHADevices, sortZHAGroups } from "./functions";
import { ZHAClusterSelectedParams, ZHADeviceSelectedParams } from "./types";

@customElement("zha-devices-page")
export class ZHADevicesPage extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() private _selectedDevice?: ZHADevice;
  @property() private _selectedCluster?: Cluster;
  @property() private _bindableDevices: ZHADevice[] = [];
  @property() private _groups: ZHAGroup[] = [];

  private _firstUpdatedCalled: boolean = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this._fetchGroups();
    }
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass) {
      this._fetchGroups();
    }
    this._firstUpdatedCalled = true;
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("_selectedDevice")) {
      this._fetchBindableDevices();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult | void {
    return html`
      <hass-subpage
        header="${this.hass!.localize("ui.panel.config.zha.devices.header")}"
      >
        <zha-node
          .isWide="${this.isWide}"
          .hass="${this.hass}"
          @zha-node-selected="${this._onDeviceSelected}"
        ></zha-node>
        ${this._selectedDevice
          ? html`
              <zha-clusters
                .hass="${this.hass}"
                .isWide="${this.isWide}"
                .selectedDevice="${this._selectedDevice}"
                @zha-cluster-selected="${this._onClusterSelected}"
              ></zha-clusters>
            `
          : ""}
        ${this._selectedCluster
          ? html`
              <zha-cluster-attributes
                .isWide="${this.isWide}"
                .hass="${this.hass}"
                .selectedNode="${this._selectedDevice}"
                .selectedCluster="${this._selectedCluster}"
              ></zha-cluster-attributes>

              <zha-cluster-commands
                .isWide="${this.isWide}"
                .hass="${this.hass}"
                .selectedNode="${this._selectedDevice}"
                .selectedCluster="${this._selectedCluster}"
              ></zha-cluster-commands>
            `
          : ""}
        ${this._selectedDevice && this._bindableDevices.length > 0
          ? html`
              <zha-device-binding-control
                .isWide="${this.isWide}"
                .hass="${this.hass}"
                .selectedDevice="${this._selectedDevice}"
                .bindableDevices="${this._bindableDevices}"
              ></zha-device-binding-control>
            `
          : ""}
        ${this._selectedDevice && this._groups.length > 0
          ? html`
              <zha-group-binding-control
                .isWide="${this.isWide}"
                .hass="${this.hass}"
                .selectedDevice="${this._selectedDevice}"
                .groups="${this._groups}"
              ></zha-group-binding-control>
            `
          : ""}
        <div class="spacer" />
      </hass-subpage>
    `;
  }

  private _onClusterSelected(
    selectedClusterEvent: HASSDomEvent<ZHAClusterSelectedParams>
  ): void {
    this._selectedCluster = selectedClusterEvent.detail.cluster;
  }

  private _onDeviceSelected(
    selectedNodeEvent: HASSDomEvent<ZHADeviceSelectedParams>
  ): void {
    this._selectedDevice = selectedNodeEvent.detail.node;
    this._selectedCluster = undefined;
  }

  private async _fetchBindableDevices(): Promise<void> {
    if (this._selectedDevice && this.hass) {
      this._bindableDevices = (
        await fetchBindableDevices(this.hass, this._selectedDevice!.ieee)
      ).sort(sortZHADevices);
    }
  }

  private async _fetchGroups() {
    this._groups = (await fetchGroups(this.hass!)).sort(sortZHAGroups);
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .spacer {
          height: 50px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-devices-page": ZHADevicesPage;
  }
}
