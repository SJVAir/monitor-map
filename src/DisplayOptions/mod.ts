import { ref } from "vue"; import type { Ref } from "vue";

export type DisplayOptions = CheckboxDisplayOptions | RadioDisplayOptions;
export type CheckboxDisplayOptions = Record<string, Checkbox>;
export type RadioDisplayOptions = Record<string, RadioOption>;
export type DisplayOptionRecord<T extends DisplayOption> = Record<string, T>;

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

export interface CheckboxConfig extends DisplayOptionConfig {
  model: boolean;
}

export interface RadioConfig extends DisplayOption {
  isDefault?: boolean;
}

class DisplayOption implements DisplayOptionConfig {
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

interface CheckboxClass extends Checkbox {};
export class Checkbox extends DisplayOption {
  static defineOptions<T extends CheckboxClass, U extends CheckboxConfig>(configs: DisplayOptionRecord<U>): DisplayOptionRecord<T> {
    Object.values(configs).map(config => new this(config));
    return configs as unknown as DisplayOptionRecord<T>;
  }

  labelClass = "checkbox";
  model: Ref<boolean>;

  constructor(config: CheckboxConfig) {
    super(config);
    this.model = ref(config.model);
  }
}

export class RadioOption<T extends RadioConfig> extends DisplayOption {
  static defineOptions<T extends RadioOption<U>, U extends RadioConfig>(configs: DisplayOptionRecord<U>): DisplayOptionRecord<T> {
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
