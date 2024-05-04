import {PluginContext} from "molstar/lib/mol-plugin/context";
import {AssetManager} from "molstar/lib/mol-util/assets";
import {Canvas3DContext} from "molstar/lib/mol-canvas3d/canvas3d";
import {DefaultPluginSpec, PluginSpec} from "molstar/lib/mol-plugin/spec";

export class OrthosliceViewer {

  /*   viewer which will be embedded in canvas
       +----------------------+------------+
       |                      |            |
       |          XZ          | controls?  |
       |                      |            |
       +----------------------+------------+
       |                      |            |
       |                      |            |
       |                      |            |
       |          XY          |    ZY      |
       |                      |            |
       |                      |            |
       |                      |            |
       +----------------------+------------+
   */
  contexts: PluginContext[] = [];
  container: HTMLDivElement = undefined as any;
  canvas: HTMLCanvasElement = undefined as any;

  volume_nx: number = 500;
  volume_ny: number = 500;
  volume_nz: number = 200;

  private initDone: () => void = undefined as any;
  initialized = new Promise<void>(res => {
    this.initDone = res;
  })

  get viewer_height_px(): number {
    return this.volume_ny + this.volume_nz
  }

  get viewer_width_px(): number {
    return this.volume_nx + this.volume_nz
  }

  get viewer_aspect_ratio(): number {
    return this.viewer_width_px / this.viewer_height_px
  }

  get canvas_aspect_ratio(): number {
    if (this.canvas.height > 0) {
      return this.canvas.width / this.canvas.height
    } else {
      return 1
    }

  }

  get viewer_width_in_canvas(): number {
    // returns the fractional width of the canvas occupied by the orthoslice viewer
    if (this.canvas_aspect_ratio > this.viewer_aspect_ratio) {
      // viewer taller than canvas at same width so width must be downscaled
      return this.viewer_aspect_ratio / this.canvas_aspect_ratio
    } else {
      // viewer less tall than canvas at same width so can fill full width
      return 1
    }
  }

  get viewer_height_in_canvas(): number {
    // returns the fractional height of the canvas occupied by the orthoslice viewer
    if (this.canvas_aspect_ratio > this.viewer_aspect_ratio) {
      // viewer less wide than canvas at same height so can fill full height
      return 1
    } else {
      // viewer wider than canvas at same height so height must be downscaled
      // height / width = 1 / aspect ratio
      // (1 / this.viewer_aspect_ratio) / (1 / this.canvas_aspect_ratio)
      // == this.canvas_aspect_ratio / this.viewer_aspect_ratio
      return this.canvas_aspect_ratio / this.viewer_aspect_ratio
    }
  }

  get viewer_x0(): number {
    const unfilled_fractional_width = 1 - this.viewer_width_in_canvas;
    const x0 = unfilled_fractional_width / 2;
    return x0
  }

  get viewer_y0(): number {
    const unfilled_fractional_height = 1 - this.viewer_height_in_canvas;
    const y0 = unfilled_fractional_height / 2;
    return y0;
  }

  get xz_width(): number {
    // as fraction of whole canvas
    return (this.volume_nx / this.viewer_width_px) / this.viewer_width_in_canvas
  }

  get xz_height(): number {
    // as fraction of whole canvas
    return (this.volume_nz / this.viewer_height_px) / this.viewer_height_in_canvas
  }

  get xz_x0(): number {
    return this.viewer_x0
  }

  get xz_y0(): number {
    return this.viewer_y0
  }

  get xy_width(): number {
    // as fraction of whole canvas
    return this.xz_width
  }

  get xy_height(): number {
    // as fraction of whole canvas
    return (this.volume_ny / this.viewer_height_px) / this.viewer_height_in_canvas
  }

  get xy_x0(): number {
    return this.viewer_x0
  }

  get xy_y0(): number {
    return this.viewer_y0 + this.xz_height
  }

  get zy_width(): number {
    // as fraction of whole canvas
    return (this.volume_nz / this.viewer_width_px) / this.viewer_width_in_canvas
  }

  get zy_height(): number {
    // as fraction of whole canvas
    return (this.volume_ny / this.viewer_height_px) / this.viewer_height_in_canvas
  }

  get zy_x0(): number {
    return this.viewer_x0 + this.xz_width
  }

  get zy_y0(): number {
    return this.viewer_y0 + this.xz_height
  }


  mount(parent: HTMLElement) {
    parent.appendChild(this.container)
  }

  unmount() {
    this.container.parentElement?.removeChild(this.container);
  }

  async init() {
    this.container = document.createElement('div');
    this.canvas = document.createElement('canvas');
    Object.assign(this.container.style, {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    })
    this.container.appendChild(this.canvas)

    const context3d = Canvas3DContext.fromCanvas(this.canvas, new AssetManager());
    const defaultSpec = DefaultPluginSpec();


    // XZ slice is first from top left
    const xz_spec: PluginSpec = {
      ...defaultSpec,
      canvas3d: {
        ...defaultSpec.canvas3d,
        viewport: {
          name: 'relative-frame',
          params: {
            x: 0, // todo: this is offset when set to this.xz_x0
            y: this.xz_y0,
            width: this.xz_width,
            height: this.xz_height,
          }
        }
      }
    }
    const xz_plugin = new PluginContext(xz_spec);
    this.contexts.push(xz_plugin);
    await xz_plugin.init();
    xz_plugin.initViewer(this.canvas, this.container, context3d)


    // XY slice is under XZ slice
    const xy_spec: PluginSpec = {
      ...defaultSpec,
      canvas3d: {
        ...defaultSpec.canvas3d,
        viewport: {
          name: 'relative-frame',
          params: {
            x: this.xy_x0,
            y: this.xy_y0,
            width: this.xy_width,
            height: this.xy_height,
          }
        }
      }
    }
    const xy_plugin = new PluginContext(xy_spec);
    this.contexts.push(xy_plugin);
    await xy_plugin.init();
    xy_plugin.initViewer(this.canvas, this.container, context3d);


    /* ZY slice */
    const zy_spec: PluginSpec = {
      ...defaultSpec,
      canvas3d: {
        ...defaultSpec.canvas3d,
        viewport: {
          name: 'relative-frame',
          params: {
            x: this.zy_x0,
            y: this.zy_y0,
            width: this.zy_width,
            height: this.zy_height,
          }
        }
      }
    }
    const zy_plugin = new PluginContext(zy_spec);
    this.contexts.push(zy_plugin);
    await zy_plugin.init();
    zy_plugin.initViewer(this.canvas, this.container, context3d);

    this.initDone();
    // console.log('canvas aspect ratio: %d', this.canvas_aspect_ratio)
    // console.log('canvas height: %d', this.canvas.height)
    // console.log('canvas width: %d', this.canvas.width)
    // console.log('XZ height: %d', this.xz_height)
    // console.log('XZ width: %d', this.xz_width)
    // console.log('XY height: %d', this.xy_height)
    // console.log('XY width: %d', this.xy_width)
  }
}