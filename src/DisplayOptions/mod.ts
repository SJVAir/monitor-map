import { ref } from "vue"; import type { Ref } from "vue";

export type DisplayOptionRecord<T extends DisplayOption> = Record<string, T>;
export type DisplayOptionConfigRecord<T extends DisplayOptionConfig> = Record<string, T>;

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

export interface DisplayOptionProps<T extends DisplayOption = DisplayOption> {
  label: string;
  options: DisplayOptionRecord<T>;
}

export interface CheckboxConfig extends DisplayOptionConfig {
  model: boolean;
}

export interface RadioConfig extends DisplayOptionConfig {
  isDefault?: boolean;
}

export interface DisplayOption extends DisplayOptionConfig {
  labelClass: string;
}

export abstract class DisplayOption implements DisplayOptionConfig {
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

export class Checkbox<T extends CheckboxConfig = CheckboxConfig> extends DisplayOption {
  static defineOptions<T extends Checkbox<U>, U extends CheckboxConfig>(configs: DisplayOptionConfigRecord<U>): DisplayOptionRecord<T> {
    //Object.values(configs).map(config => new this(config));
    //return configs as unknown as DisplayOptionRecord<T>;
    return Object.entries(configs).reduce((options: DisplayOptionRecord<T>, config) => {
        options[config[0]] = new this(config[1]) as T;
        return options;
      }, {});
  }

  labelClass = "checkbox";
  model: Ref<boolean>;

  constructor(config: T) {
    super(config);
    this.model = ref(config.model);
  }
}

export class RadioOption<T extends RadioConfig> extends DisplayOption {
  static defineOptions<T extends RadioOption<U>, U extends RadioConfig>(configs: DisplayOptionConfigRecord<U>): DisplayOptionRecord<T> {
    const model = ref<string>("");
    return Object.entries(configs).reduce((options: DisplayOptionRecord<T>, config) => {
        if (config[1].isDefault) {
          model.value = config[0];
        }
        options[config[0]] = new this(model, ...config) as T;
        return options;
      }, {});
  }

  labelClass = "radio";
  model: Ref<String>;
  value: string;

  constructor(sharedModel: Ref<string>, value: string, config: T) {
    super(config);
    this.model = sharedModel;
    this.value = value;
  }
}
