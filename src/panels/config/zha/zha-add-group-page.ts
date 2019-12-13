import {
  property,
  LitElement,
  html,
  customElement,
  css,
  CSSResult,
} from "lit-element";

import "../../../layouts/hass-subpage";
import "../../../layouts/hass-error-screen";
import "../ha-config-section";
import { HomeAssistant } from "../../../types";
import { haStyleDialog } from "../../../resources/styles";
import { ZHADevice, fetchDevices, addGroup, ZHAGroup } from "../../../data/zha";
import "./zha-devices-data-table";
import { SelectionChangedEvent } from "../../../components/data-table/ha-data-table";
import { navigate } from "../../../common/navigate";
import { PolymerChangedEvent } from "../../../polymer-types";
import { PaperInputElement } from "@polymer/paper-input/paper-input";

@customElement("zha-add-group-page")
export class ZHAAddGroupPage extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public devices: ZHADevice[] = [];
  @property() private _canAdd: boolean = false;
  @property() private _processingAdd: boolean = false;
  @property() private _groupName: string = "";

  private _selectedDevicesToAdd: string[] = [];

  public connectedCallback(): void {
    super.connectedCallback();
    this._fetchData();
  }

  protected render() {
    return html`
      <hass-subpage
        .header=${this.hass.localize("ui.panel.config.zha.common.create_group")}
      >
        <ha-config-section .isWide=${!this.narrow}>
          <span slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.zha.common.create_group_details"
            )}
          </span>
          <paper-input
            type="string"
            .value="${this._groupName}"
            @value-changed=${this._handleNameChange}
            placeholder="${this.hass!.localize(
              "ui.panel.config.zha.common.group_name_placeholder"
            )}"
          ></paper-input>

          <div class="header">
            ${this.hass.localize("ui.panel.config.zha.common.add_members")}
          </div>

          <zha-devices-data-table
            .hass=${this.hass}
            .devices=${this.devices}
            .narrow=${this.narrow}
            .selectable=${true}
            @selection-changed=${this._handleAddSelectionChanged}
            class="table"
          >
          </zha-devices-data-table>

          <div class="paper-dialog-buttons">
            <mwc-button
              ?disabled="${!this._canAdd}"
              @click="${this._createGroup}"
              class="button"
            >
              <paper-spinner
                ?active="${this._processingAdd}"
                alt="Creating Group"
              ></paper-spinner>
              ${this.hass!.localize(
                "ui.panel.config.zha.common.create"
              )}</mwc-button
            >
          </div>
        </ha-config-section>
      </hass-subpage>
    `;
  }

  private async _fetchData() {
    this.devices = await fetchDevices(this.hass!);
  }

  private _handleAddSelectionChanged(ev: CustomEvent): void {
    const changedSelection = ev.detail as SelectionChangedEvent;
    const entity = changedSelection.id;
    if (changedSelection.selected) {
      this._selectedDevicesToAdd.push(entity);
    } else {
      const index = this._selectedDevicesToAdd.indexOf(entity);
      if (index !== -1) {
        this._selectedDevicesToAdd.splice(index, 1);
      }
    }
    this._canAdd = this._selectedDevicesToAdd.length > 0;
  }

  private async _createGroup(ev: CustomEvent): Promise<void> {
    this._processingAdd = true;
    const group: ZHAGroup = await addGroup(
      this.hass,
      this._groupName,
      this._selectedDevicesToAdd
    );
    this._selectedDevicesToAdd = [];
    this._canAdd = false;
    this._processingAdd = false;
    navigate(this, `/config/zha/group/${group.group_id}`);
  }

  private _handleNameChange(ev: PolymerChangedEvent<string>) {
    const target = ev.currentTarget as PaperInputElement;
    if (target.value) {
      this._groupName = target.value;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        .header {
          font-family: var(--paper-font-display1_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-display1_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-display1_-_font-size);
          font-weight: var(--paper-font-display1_-_font-weight);
          letter-spacing: var(--paper-font-display1_-_letter-spacing);
          line-height: var(--paper-font-display1_-_line-height);
          opacity: var(--dark-primary-opacity);
        }

        .button {
          float: right;
        }

        .table {
          height: 400px;
          overflow: auto;
        }

        ha-config-section *:last-child {
          padding-bottom: 24px;
        }
        mwc-button paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
        paper-spinner {
          display: none;
        }
        paper-spinner[active] {
          display: block;
        }
      `,
    ];
  }
}
