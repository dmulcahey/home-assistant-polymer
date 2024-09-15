import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { DataSet } from "vis-data/peer/esm/vis-data";
import {
  Edge,
  EdgeOptions,
  Network,
  Node,
} from "vis-network/peer/esm/vis-network";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/search-input";
import "../../../../../components/device/ha-device-picker";
import "../../../../../components/ha-button-menu";
import "../../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../../components/ha-checkbox";
import "../../../../../components/ha-formfield";
import { DeviceRegistryEntry } from "../../../../../data/device_registry";
import {
  fetchDevices,
  refreshTopology,
  ZHADevice,
} from "../../../../../data/zha";
import "../../../../../layouts/hass-tabs-subpage";
import { ValueChangedEvent } from "../../../../../types";
import type { HomeAssistant, Route } from "../../../../../types";
import { formatAsPaddedHex } from "./functions";
import { zhaTabs } from "./zha-config-dashboard";

@customElement("zha-network-visualization-page")
export class ZHANetworkVisualizationPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean }) public isWide = false;

  @property()
  public zoomedDeviceIdFromURL?: string;

  @state()
  private zoomedDeviceId?: string;

  @state()
  private _filter?: string;

  @query("#visualization", true)
  private _visualization?: HTMLElement;

  private _devices: Map<string, ZHADevice> = new Map();

  private _devicesByDeviceId: Map<string, ZHADevice> = new Map();

  private _nodes: DataSet<Node & { _lowercaseLabel?: string }> = new DataSet();

  private _edges: DataSet<Edge> = new DataSet();

  private _network?: Network;

  private _autoZoom = true;

  // Debounce timeout ID
  private _searchDebounceTimeout?: number;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);

    // Prevent zoomedDeviceIdFromURL from being restored to zoomedDeviceId after the user clears it
    if (this.zoomedDeviceIdFromURL) {
      this.zoomedDeviceId = this.zoomedDeviceIdFromURL;
    }

    if (this.hass) {
      this._fetchData();
    }

    this._network = new Network(
      this._visualization!,
      { nodes: this._nodes, edges: this._edges },
      {
        autoResize: true,
        layout: {
          hierarchical: {
            enabled: true,
            direction: "UD",
            sortMethod: "hubsize",
            nodeSpacing: 600,
            levelSeparation: 1000,
          },
          improvedLayout: false, // Disable improvedLayout as hierarchical is used
        },
        physics: {
          enabled: false,
        },
        nodes: {
          font: {
            multi: "html",
          },
        },
        edges: {
          smooth: {
            enabled: true,
            type: "continuous",
            forceDirection: "none",
            roundness: 0.6,
          },
        },
      }
    );

    this._network.on("doubleClick", (properties) => {
      const ieee = properties.nodes[0];
      if (ieee) {
        const device = this._devices.get(ieee);
        if (device) {
          navigate(`/config/devices/device/${device.device_reg_id}`);
        }
      }
    });

    this._network.on("click", (properties) => {
      const ieee = properties.nodes[0];
      if (ieee) {
        const device = this._devices.get(ieee);
        if (device && this._autoZoom) {
          this.zoomedDeviceId = device.device_reg_id;
          this._zoomToDevice();
        }
      }
    });

    this._network.on("stabilized", () => {
      if (this.zoomedDeviceId) {
        this._zoomToDevice();
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._network) {
      this._network.destroy();
    }
    if (this._searchDebounceTimeout) {
      clearTimeout(this._searchDebounceTimeout);
    }
  }

  protected render() {
    return html`
      <hass-tabs-subpage
        .tabs=${zhaTabs}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        .route=${this.route}
        .header=${this.hass.localize(
          "ui.panel.config.zha.visualization.header"
        )}
      >
        ${this.narrow
          ? html`
              <div slot="header">
                <search-input
                  .hass=${this.hass}
                  class="header"
                  @value-changed=${this._handleSearchChange}
                  .filter=${this._filter}
                  .label=${this.hass.localize(
                    "ui.panel.config.zha.visualization.highlight_label"
                  )}
                >
                </search-input>
              </div>
            `
          : ""}
        <div class="header">
          ${!this.narrow
            ? html`<search-input
                .hass=${this.hass}
                @value-changed=${this._handleSearchChange}
                .filter=${this._filter}
                .label=${this.hass.localize(
                  "ui.panel.config.zha.visualization.highlight_label"
                )}
              ></search-input>`
            : ""}
          <ha-device-picker
            .hass=${this.hass}
            .value=${this.zoomedDeviceId}
            .label=${this.hass.localize(
              "ui.panel.config.zha.visualization.zoom_label"
            )}
            .deviceFilter=${this._filterDevices}
            @value-changed=${this._onZoomToDevice}
          ></ha-device-picker>
          <div class="controls">
            <ha-formfield
              .label=${this.hass!.localize(
                "ui.panel.config.zha.visualization.auto_zoom"
              )}
            >
              <ha-checkbox
                @change=${this._handleAutoZoomCheckboxChange}
                .checked=${this._autoZoom}
              >
              </ha-checkbox>
            </ha-formfield>
            <mwc-button @click=${this._refreshTopology}>
              ${this.hass!.localize(
                "ui.panel.config.zha.visualization.refresh_topology"
              )}
            </mwc-button>
          </div>
        </div>
        <div id="visualization"></div>
      </hass-tabs-subpage>
    `;
  }

  private async _fetchData() {
    const devices = await fetchDevices(this.hass!);
    this._devices = new Map(
      devices.map((device: ZHADevice) => [device.ieee, device])
    );
    this._devicesByDeviceId = new Map(
      devices.map((device: ZHADevice) => [device.device_reg_id, device])
    );
    this._updateDevices(devices);
  }

  private _updateDevices(devices: ZHADevice[]) {
    const newNodesMap = new Map<string, Node & { _lowercaseLabel?: string }>();
    const newEdgesMap = new Map<string, Edge>();

    devices.forEach((device) => {
      const label = this._buildLabel(device);
      newNodesMap.set(device.ieee, {
        id: device.ieee,
        label: label,
        shape: this._getShape(device),
        mass: this._getMass(device),
        color: {
          background: device.available ? "#66FF99" : "#FF9999",
        },
        _lowercaseLabel: label.toLowerCase(),
      });

      if (device.neighbors && device.neighbors.length > 0) {
        device.neighbors.forEach((neighbor) => {
          if (neighbor.relationship === "NoneOfTheAbove") {
            return;
          }
          // Consistent edge key using sorted IEEE addresses to avoid duplication
          const sortedIeee = [device.ieee, neighbor.ieee].sort();
          const edgeKey = `${sortedIeee[0]}-${sortedIeee[1]}`;

          newEdgesMap.set(edgeKey, {
            from:
              neighbor.relationship !== "Parent" ? device.ieee : neighbor.ieee,
            to:
              neighbor.relationship === "Parent" ? device.ieee : neighbor.ieee,
            label: neighbor.lqi.toString(),
            color: this._getLQI(parseInt(neighbor.lqi)).color,
            width: this._getLQI(parseInt(neighbor.lqi)).width,
            length: 2000 - 4 * parseInt(neighbor.lqi),
            arrows: {
              from: {
                enabled:
                  neighbor.relationship === "Child" ||
                  neighbor.relationship === "Parent",
              },
            },
            dashes: neighbor.relationship === "Sibling",
          });
        });
      }
    });

    // Incrementally update nodes
    const existingNodeIds = new Set(this._nodes.getIds() as string[]);
    const newNodeIds = new Set(newNodesMap.keys());

    // Nodes to remove
    const nodesToRemove = [...existingNodeIds].filter(
      (id) => !newNodeIds.has(id)
    );

    if (nodesToRemove.length > 0) {
      this._nodes.remove(nodesToRemove);
    }

    // Nodes to add or update
    const nodesToAddOrUpdate: (Node & { _lowercaseLabel?: string })[] = [];
    newNodesMap.forEach((node, id) => {
      const existingNode = this._nodes.get(id);
      if (
        !existingNode ||
        (existingNode as any)._lowercaseLabel !== node._lowercaseLabel ||
        existingNode.label !== node.label ||
        existingNode.color !== node.color ||
        existingNode.shape !== node.shape ||
        existingNode.mass !== node.mass
      ) {
        nodesToAddOrUpdate.push(node);
      }
    });
    if (nodesToAddOrUpdate.length > 0) {
      this._nodes.update(nodesToAddOrUpdate);
    }

    // Incrementally update edges
    const existingEdgeKeys = new Set(this._edges.getIds() as string[]);
    const newEdgeKeys = new Set(newEdgesMap.keys());

    // Edges to remove
    const edgesToRemove = [...existingEdgeKeys].filter(
      (id) => !newEdgeKeys.has(id)
    );

    if (edgesToRemove.length > 0) {
      this._edges.remove(edgesToRemove);
    }

    // Edges to add or update
    const edgesToAddOrUpdate: Edge[] = [];
    newEdgesMap.forEach((edge, key) => {
      const existingEdge = this._edges.get(key);
      if (
        !existingEdge ||
        existingEdge.label !== edge.label ||
        existingEdge.color !== edge.color ||
        existingEdge.width !== edge.width ||
        existingEdge.length !== edge.length ||
        JSON.stringify(existingEdge.arrows) !== JSON.stringify(edge.arrows) ||
        existingEdge.dashes !== edge.dashes
      ) {
        edgesToAddOrUpdate.push(edge);
      }
    });
    if (edgesToAddOrUpdate.length > 0) {
      this._edges.update(edgesToAddOrUpdate);
    }
    this._network!.fit();
  }

  private _getLQI(lqi: number): EdgeOptions {
    if (lqi > 192) {
      return { color: { color: "#17ab00", highlight: "#17ab00" }, width: 4 };
    }
    if (lqi > 128) {
      return { color: { color: "#e6b402", highlight: "#e6b402" }, width: 3 };
    }
    if (lqi > 80) {
      return { color: { color: "#fc4c4c", highlight: "#fc4c4c" }, width: 2 };
    }
    return { color: { color: "#bfbfbf", highlight: "#bfbfbf" }, width: 1 };
  }

  private _getMass(device: ZHADevice): number {
    if (!device.available) {
      return 6;
    }
    if (device.device_type === "Coordinator") {
      return 2;
    }
    if (device.device_type === "Router") {
      return 4;
    }
    return 5;
  }

  private _getShape(device: ZHADevice): string {
    if (device.device_type === "Coordinator") {
      return "box";
    }
    if (device.device_type === "Router") {
      return "ellipse";
    }
    return "circle";
  }

  private _buildLabel(device: ZHADevice): string {
    let label =
      device.user_given_name !== null
        ? `<b>${device.user_given_name}</b>\n`
        : "";
    label += `<b>IEEE: </b>${device.ieee}`;
    label += `\n<b>Device Type: </b>${device.device_type.replace("_", " ")}`;
    if (device.nwk != null) {
      label += `\n<b>NWK: </b>${formatAsPaddedHex(device.nwk)}`;
    }
    if (device.manufacturer != null && device.model != null) {
      label += `\n<b>Device: </b>${device.manufacturer} ${device.model}`;
    } else {
      label += "\n<b>Device is not in <i>'zigbee.db'</i></b>";
    }
    if (device.area_id) {
      label += `\n<b>Area ID: </b>${device.area_id}`;
    }
    return label;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value.toLowerCase();
    clearTimeout(this._searchDebounceTimeout);
    this._searchDebounceTimeout = window.setTimeout(() => {
      this._applyFilter();
    }, 300);
  }

  private _applyFilter() {
    if (!this._network) return;
    if (this._filter) {
      const filteredNodeIds: (string | number)[] = [];
      this._nodes.forEach((node) => {
        if (
          node._lowercaseLabel &&
          node._lowercaseLabel.includes(this._filter!)
        ) {
          filteredNodeIds.push(node.id!);
        }
      });
      this.zoomedDeviceId = "";
      this._zoomOut();
      this._network.selectNodes(filteredNodeIds, true);
    } else {
      this._network.unselectAll();
    }
  }

  private _onZoomToDevice(event: ValueChangedEvent<string>) {
    event.stopPropagation();
    this.zoomedDeviceId = event.detail.value;
    if (!this._network) {
      return;
    }
    this._zoomToDevice();
  }

  private _zoomToDevice() {
    this._filter = "";
    if (!this.zoomedDeviceId) {
      this._zoomOut();
    } else {
      const device: ZHADevice | undefined = this._devicesByDeviceId.get(
        this.zoomedDeviceId
      );
      if (device) {
        this._network!.fit({
          nodes: [device.ieee],
          animation: { duration: 500, easingFunction: "easeInQuad" },
        });
      }
    }
  }

  private _zoomOut() {
    this._network!.fit({
      nodes: [],
      animation: { duration: 500, easingFunction: "easeOutQuad" },
    });
  }

  private async _refreshTopology(): Promise<void> {
    await refreshTopology(this.hass);
  }

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (!this.hass) {
      return false;
    }
    for (const parts of device.identifiers) {
      for (const part of parts) {
        if (part === "zha") {
          return true;
        }
      }
    }
    return false;
  };

  private _handleAutoZoomCheckboxChange(ev: Event) {
    this._autoZoom = (ev.target as HaCheckbox).checked;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .header {
          border-bottom: 1px solid var(--divider-color);
          padding: 0 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: var(--header-height);
          box-sizing: border-box;
        }

        .header > * {
          padding: 0 8px;
        }

        :host([narrow]) .header {
          flex-direction: column;
          align-items: stretch;
          height: calc(var(--header-height) * 2);
        }

        .search-toolbar {
          display: flex;
          align-items: center;
          color: var(--secondary-text-color);
          padding: 0 16px;
        }

        search-input {
          flex: 1;
          display: block;
        }

        search-input.header {
          color: var(--secondary-text-color);
        }

        ha-device-picker {
          flex: 1;
        }

        .controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        #visualization {
          height: calc(100% - var(--header-height));
          width: 100%;
        }
        :host([narrow]) #visualization {
          height: calc(100% - (var(--header-height) * 2));
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-network-visualization-page": ZHANetworkVisualizationPage;
  }
}
