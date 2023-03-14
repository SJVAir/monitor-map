import { ref } from "vue"; import type { Ref } from "vue";

export type DisplayOptions = CheckboxDisplayOptions | RadioDisplayOptions;
export type CheckboxDisplayOptions = Record<string, DisplayOptionCheckbox>;
export type RadioDisplayOptions = Record<string, DisplayOptionRadio>;

interface DisplayOptionIcon {
  id: string;
  class?: string;
}

interface DisplayOptionConfig {
  containerClass?: string;
  icon?: DisplayOptionIcon;
  svg?: string;
  label: string;
}


interface DisplayOptionCheckboxConfig extends DisplayOptionConfig {
  model: boolean;
}


interface DisplayOptionRadioConfig extends DisplayOption {
  isDefault?: boolean;
  value: string;
}

interface TileLayerConfig extends DisplayOptionRadioConfig {
  options: TileLayerOptions;
  urlTemplate: string;
}


interface TileLayerOptions extends L.TileLayerOptions {
  apiKey?: string;
}

abstract class DisplayOption implements DisplayOptionConfig {
  containerClass?: string;
  icon?: DisplayOptionIcon;
  svg?: string;
  label: string;

  constructor(config: DisplayOptionConfig) {
    if (config.icon && config.svg) {
      throw new Error(`Error constructing "${ config.label }" display option: Cannot accept both "icon" and "svg".`);
    }
    this.containerClass = config.containerClass || "";
    this.icon = config.icon;
    this.svg = config.svg;
    this.label = config.label;
  }
}

export class DisplayOptionCheckbox extends DisplayOption {
  static defineOptions(configs: Record<string, DisplayOptionCheckboxConfig>): CheckboxDisplayOptions {
    Object.values(configs).map(config => new DisplayOptionCheckbox(config));
    return configs as unknown as CheckboxDisplayOptions;
  }

  labelClass = "checkbox";
  model: Ref<boolean>;

  constructor(config: DisplayOptionCheckboxConfig) {
    super(config);
    this.model = ref(config.model);
  }
}

function defineOptions<T extends DisplayOptionRadioConfig, U extends RadioDisplayOptions>(configs: Record<string, T>): U {
  const model = ref<string>("");
  Object.values(configs).map(config => {
    if (config.isDefault) {
      model.value = config.label;
    }
    return new DisplayOptionRadio(model, config);
  });
  return configs as unknown as U;
}

export class DisplayOptionRadio extends DisplayOption implements DisplayOptionRadioConfig {
  static defineOptions = defineOptions<DisplayOptionRadioConfig, RadioDisplayOptions>;
  //static defineOptions(configs: Record<string, DisplayOptionRadioConfig>): RadioDisplayOptions 

  labelClass = "radio";
  model: Ref<String>;
  value: string;

  constructor(sharedModel: Ref<string>, config: DisplayOptionRadioConfig) {
    super(config);
    this.model = sharedModel;
    this.value = config.value;
  }
}

export class DisplayOptionTileLayer extends DisplayOptionRadio implements TileLayerConfig {
  static defineOptions = defineOptions<TileLayerConfig, TileLayerOptions>;

  options: TileLayerOptions;
  urlTemplate: string;

  constructor(sharedModel: Ref<string>, config: TileLayerConfig) {
    super(sharedModel, config);
    this.options = config.options;
    this.urlTemplate = config.urlTemplate;
  }
}
