import "../../../layouts/hass-subpage";
import "./zha-groups-data-table";

import {
  LitElement,
  html,
  TemplateResult,
  property,
  customElement,
  CSSResult,
  css,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { ZHAGroup, fetchGroups, removeGroups } from "../../../data/zha";
import { sortZHAGroups } from "./functions";
import { SelectionChangedEvent } from "../../../components/data-table/ha-data-table";
import "@material/mwc-button";
import "@polymer/paper-spinner/paper-spinner";
import { haStyleDialog } from "../../../resources/styles";

@customElement("zha-groups-dashboard")
export class ZHAGroupsDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow = false;
  @property() public _groups!: ZHAGroup[];
  @property() private _canRemove: boolean = false;
  @property() private _processingRemove: boolean = false;

  private _selectedGroupsToRemove: number[] = [];

  public connectedCallback(): void {
    super.connectedCallback();
    this._fetchGroups();
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        header=${this.hass.localize(
          "ui.panel.config.zha.groups.zha_zigbee_groups"
        )}
      >
        <div class="content">
          <zha-groups-data-table
            .hass=${this.hass}
            .narrow=${this.narrow}
            .groups=${this._groups}
            .selectable=${true}
            @selection-changed=${this._handleRemoveSelectionChanged}
            class="table"
          ></zha-groups-data-table>
        </div>
        <div class="paper-dialog-buttons">
          <mwc-button
            ?disabled="${!this._canRemove}"
            @click="${this._removeGroup}"
            class="button"
          >
            <paper-spinner
              ?active="${this._processingRemove}"
              alt="Removing Groups"
            ></paper-spinner>
            ${this.hass!.localize(
              "ui.panel.config.zha.groups.remove_groups"
            )}</mwc-button
          >
        </div>
      </hass-subpage>
    `;
  }

  private async _fetchGroups() {
    this._groups = (await fetchGroups(this.hass!)).sort(sortZHAGroups);
  }

  private _handleRemoveSelectionChanged(ev: CustomEvent): void {
    const changedSelection = ev.detail as SelectionChangedEvent;
    const groupId = Number(changedSelection.id);
    if (changedSelection.selected) {
      this._selectedGroupsToRemove.push(groupId);
    } else {
      const index = this._selectedGroupsToRemove.indexOf(groupId);
      if (index !== -1) {
        this._selectedGroupsToRemove.splice(index, 1);
      }
    }
    this._canRemove = this._selectedGroupsToRemove.length > 0;
  }

  private async _removeGroup(): Promise<void> {
    this._processingRemove = true;
    this._groups = await removeGroups(this.hass, this._selectedGroupsToRemove);
    this._selectedGroupsToRemove = [];
    this._canRemove = false;
    this._processingRemove = false;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        .content {
          padding: 4px;
        }
        zha-groups-data-table {
          width: 100%;
        }
        .button {
          float: right;
        }

        .table {
          height: 200px;
          overflow: auto;
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

declare global {
  interface HTMLElementTagNameMap {
    "zha-groups-dashboard": ZHAGroupsDashboard;
  }
}
