import {
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { computeRTLDirection } from "../../../../../common/util/compute_rtl";
import "../../../../../components/ha-code-editor";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZHADeviceChildrenDialogParams } from "./show-dialog-zha-device-children";
import "../../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
} from "../../../../../components/data-table/ha-data-table";
import { fetchDevices, ZHADevice } from "../../../../../data/zha";

export interface DeviceRowData extends DataTableRowData {
  id: string;
  name: string;
  lqi: number;
}

@customElement("dialog-zha-device-children")
class DialogZHADeviceChildren extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _device: any;

  @internalProperty() private _devices: Map<string, ZHADevice> = new Map();

  private _deviceChildren = memoizeOne(
    (device: ZHADevice, devices: Map<string, ZHADevice>) => {
      const outputDevices: DeviceRowData[] = [];

      device.neighbors.forEach((child) => {
        const zhaDevice: ZHADevice | undefined = devices.get(child.ieee);
        if (zhaDevice) {
          outputDevices.push({
            name: zhaDevice.user_given_name || zhaDevice.name,
            id: zhaDevice.device_reg_id,
            lqi: child.lqi,
          });
        }
      });

      return outputDevices;
    }
  );

  private _columns: DataTableColumnContainer = {
    name: {
      title: "Name",
      sortable: true,
      filterable: true,
      direction: "asc",
      grows: true,
    },
    lqi: {
      title: "LQI",
      sortable: true,
      filterable: true,
      direction: "asc",
      width: "75px",
    },
  };

  public async showDialog(
    params: ZHADeviceChildrenDialogParams
  ): Promise<void> {
    this._device = params.device;
    await this._fetchData();
  }

  protected render(): TemplateResult {
    if (!this._device) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        hideActions
        @closing="${this._close}"
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(`ui.dialogs.zha_device_info.device_children`)
        )}
      >
        <ha-data-table
          .columns=${this._columns}
          .data=${this._deviceChildren(this._device, this._devices)}
          auto-height
          .dir=${computeRTLDirection(this.hass)}
          .searchLabel=${this.hass.localize("ui.components.data-table.search")}
          .noDataText=${this.hass.localize("ui.components.data-table.no-data")}
        ></ha-data-table>
      </ha-dialog>
    `;
  }

  private async _fetchData(): Promise<void> {
    if (this._device && this.hass) {
      const devices = await fetchDevices(this.hass!);
      this._devices = new Map(
        devices.map((device: ZHADevice) => [device.ieee, device])
      );
    }
  }

  private _close(): void {
    this._device = undefined;
  }

  static get styles(): CSSResult {
    return haStyleDialog;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-device-children": DialogZHADeviceChildren;
  }
}
