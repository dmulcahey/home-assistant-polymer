import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-form/ha-form";
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
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public device?: ZHADevice;

  @property({ attribute: false })
  public selectedCluster?: Cluster;

  @state() private _commands: Command[] | undefined;

  @state() private _selectedCommandKey?: string;

  @state()
  private _commandData: Record<string, unknown> = {};

  protected updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("selectedCluster")) {
      this._commands = undefined;
      this._selectedCommandKey = undefined;
      this._commandData = {};
      this._fetchCommandsForCluster();
    }
    super.updated(changedProperties);
  }

  protected render() {
    if (!this.device || !this.selectedCluster || !this._commands) {
      return nothing;
    }
    const selectedCommand = this._selectedCommand;
    const issueClusterCommandServiceData = selectedCommand
      ? this._computeIssueClusterCommandServiceData(selectedCommand)
      : undefined;
    return html`
      <div class="content">
        <div class="command-picker">
          <ha-select
            .label=${this.hass!.localize(
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
          selectedCommand
            ? html`
                <div class="command-form">
                  <ha-form
                    .hass=${this.hass}
                    .schema=${selectedCommand.schema}
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
                    ${this.hass!.localize(
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
    return this.hass!.localize(
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
    if (this.device && this.selectedCluster && this.hass) {
      this._commands = await fetchCommandsForCluster(
        this.hass,
        this.device.ieee,
        this.selectedCluster.endpoint_id,
        this.selectedCluster.id,
        this.selectedCluster.type
      );
      this._commands.sort(
        (a, b) =>
          a.zcl_command.name.localeCompare(b.zcl_command.name) ||
          a.zcl_command.command_type.localeCompare(b.zcl_command.command_type)
      );
      if (this._commands.length > 0) {
        this._selectedCommandKey = this._commandKey(this._commands[0]);
      }
    }
  }

  private _computeIssueClusterCommandServiceData(
    selectedCommand: Command
  ): IssueCommandServiceData | undefined {
    if (!this.device || !this.selectedCluster) {
      return undefined;
    }
    const hasRequiredValues = selectedCommand.schema.every((field) => {
      const value = this._commandData[field.name];
      return (
        !field.required ||
        (value !== "" && value !== undefined && value !== null)
      );
    });
    if (!hasRequiredValues) {
      return undefined;
    }

    return {
      ieee: this.device.ieee,
      endpoint_id: this.selectedCluster.endpoint_id,
      cluster_id: this.selectedCluster.id,
      cluster_type: this.selectedCluster.type,
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
          padding-bottom: 10px;
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
