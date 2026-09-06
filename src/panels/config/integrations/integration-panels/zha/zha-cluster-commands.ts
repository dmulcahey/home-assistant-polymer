import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-form/ha-form";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import type { Cluster, Command, ZHADevice } from "../../../../../data/zha";
import { fetchCommandsForCluster } from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../../types";
import { formatAsPaddedHex } from "./functions";
import type { IssueCommandServiceData } from "./types";

@customElement("zha-cluster-commands")
export class ZHAClusterCommands extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public device?: ZHADevice;

  @property({ attribute: false })
  public selectedCluster?: Cluster;

  @state() private _commands: Command[] | undefined;

  @state() private _selectedCommandKey?: string;

  @state()
  private _commandData: Record<string, unknown> = {};

  @state() private _loadError = false;

  private _loadRequestId = 0;

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    const deviceChanged =
      changedProperties.has("device") &&
      this.device?.ieee !== changedProperties.get("device")?.ieee;
    if (changedProperties.has("selectedCluster") || deviceChanged) {
      this._commands = undefined;
      this._selectedCommandKey = undefined;
      this._commandData = {};
      this._loadError = false;
      this._fetchCommandsForCluster();
    }
  }

  protected render() {
    if (!this.hass || !this.device || !this.selectedCluster) {
      return nothing;
    }
    const issueClusterCommandServiceData = this._issueClusterCommandServiceData;
    if (this._loadError) {
      return html`<ha-alert alert-type="error">
        ${this.hass.localize("ui.panel.config.zha.cluster_commands.load_failed")}
      </ha-alert>`;
    }
    if (!this._commands) {
      return html`<ha-spinner></ha-spinner>`;
    }
    return html`
      <div class="content">
        <div class="command-picker">
          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.zha.cluster_commands.commands_of_cluster"
            )}
            class="menu"
            .value=${this._selectedCommandKey}
            @selected=${this._selectedCommandChanged}
            .options=${this._commands.map((entry) => ({
              value: this._commandKey(entry),
              label: this._formatCommandLabel(entry),
            }))}
          >
          </ha-select>
        </div>
        ${
          this._selectedCommandKey !== undefined
            ? html`
                <div class="command-form">
                  <ha-form
                    .hass=${this.hass}
                    .schema=${this._selectedCommand?.schema ?? []}
                    @value-changed=${this._commandDataChanged}
                    .data=${this._commandData}
                  ></ha-form>
                </div>
                <div class="card-actions">
                  <ha-call-service-button
                    domain="zha"
                    service="issue_zigbee_cluster_command"
                    .data=${issueClusterCommandServiceData ?? {}}
                    .disabled=${!issueClusterCommandServiceData}
                    appearance="accent"
                  >
                    ${this.hass.localize(
                      "ui.panel.config.zha.cluster_commands.issue_zigbee_command"
                    )}
                  </ha-call-service-button>
                </div>
              `
            : nothing
        }
      </div>
    `;
  }

  private _commandKey(command: Command): string {
    return JSON.stringify([
      command.zcl_command.id,
      command.zcl_command.name,
      command.zcl_command.command_type,
    ]);
  }

  private _formatCommandLabel(command: Command): string {
    const { name, command_type, id } = command.zcl_command;
    return this.hass.localize(
      "ui.panel.config.zha.cluster_commands.command_label",
      {
        name,
        type: command_type,
        id: formatAsPaddedHex(id),
      }
    );
  }

  private get _selectedCommand(): Command | undefined {
    return this._commands?.find(
      (command) => this._commandKey(command) === this._selectedCommandKey
    );
  }

  private async _fetchCommandsForCluster(): Promise<void> {
    const requestId = ++this._loadRequestId;
    const device = this.device;
    const selectedCluster = this.selectedCluster;
    const hass = this.hass;
    if (!device || !selectedCluster || !hass) {
      return;
    }

    try {
      const commands = await fetchCommandsForCluster(
        hass,
        device.ieee,
        selectedCluster.endpoint_id,
        selectedCluster.id,
        selectedCluster.type
      );
      if (
        requestId !== this._loadRequestId ||
        this.selectedCluster !== selectedCluster ||
        this.device?.ieee !== device.ieee
      ) {
        return;
      }
      commands.sort((a, b) => {
        const nameComparison = a.zcl_command.name.localeCompare(
          b.zcl_command.name
        );
        if (nameComparison !== 0) {
          return nameComparison;
        }
        return a.zcl_command.command_type.localeCompare(
          b.zcl_command.command_type
        );
      });
      this._commands = commands;
      if (commands.length > 0) {
        this._selectedCommandKey = this._commandKey(this._commands[0]);
      }
    } catch (_err) {
      if (
        requestId === this._loadRequestId &&
        this.selectedCluster === selectedCluster &&
        this.device?.ieee === device.ieee
      ) {
        this._loadError = true;
      }
    }
  }

  private get _issueClusterCommandServiceData():
    IssueCommandServiceData | undefined {
    const device = this.device;
    const selectedCluster = this.selectedCluster;
    if (!device || !selectedCluster) {
      return undefined;
    }
    const selectedCommand = this._selectedCommand;
    if (!selectedCommand) {
      return undefined;
    }
    const hasRequiredValues = selectedCommand.schema.every((field) => {
      if (!field.required) {
        return true;
      }
      const value = this._commandData[field.name];
      return value !== "" && value !== undefined && value !== null;
    });
    if (!hasRequiredValues) {
      return undefined;
    }

    return {
      ieee: device.ieee,
      endpoint_id: selectedCluster.endpoint_id,
      cluster_id: selectedCluster.id,
      cluster_type: selectedCluster.type,
      command: selectedCommand.zcl_command.id,
      command_type: selectedCommand.zcl_command.command_type,
      params: this._commandData,
    };
  }

  private _commandDataChanged(
    ev: ValueChangedEvent<Record<string, unknown>>
  ): void {
    this._commandData = ev.detail.value;
  }

  private _selectedCommandChanged(event: HaSelectSelectEvent): void {
    if (this._selectedCommandKey === event.detail.value) {
      return;
    }
    this._selectedCommandKey = event.detail.value;
    this._commandData = {};
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }

        ha-spinner {
          display: block;
          margin: var(--ha-space-4) auto;
        }

        .content {
          padding-top: var(--ha-space-4);
        }

        ha-select {
          margin-top: var(--ha-space-4);
        }
        .menu {
          width: 100%;
        }

        .command-picker,
        .command-form {
          padding-inline: var(--ha-space-7);
          padding-bottom: var(--ha-space-3);
        }

        .card-actions {
          display: flex;
          border-top: 1px solid var(--divider-color);
          padding: var(--ha-space-2);
          justify-content: flex-end;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster-commands": ZHAClusterCommands;
  }
}
