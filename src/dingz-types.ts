/**
 * ioBroker.dingz: Connect Dingz (http://www.dingz.ch) with ioBroker
 * Copyright (c) 2020 by G. Weirich
 * License: See LICENSE
 * 
 * This is an "empty" file with only declarations of 
 * data types we might receive from the dingz
 */

/**
 * General informations about the Dingz.
 * ${API}/device
 */
export type DeviceInfo = {
  [mac: string]: {
    type: string;
    battery: boolean;
    reachable: boolean;
    meshroot: boolean;
    fw_version: string;
    hw_version: string;
    fw_version_puck: string;
    bl_version_puck: string;
    hw_version_puck: string;
    hw_id_puck: string;
    puck_sn: string;
    puck_production_date: {
      year: number;
      month: number;
      day: number;
    };
    puck_hw_model: string;
    front_hw_model: string;
    front_production_date: string;
    front_sn: string;
    dip_config: number;
    has_pir: boolean;
    hash: string;
  };
}

export type ActionState = {
  generic: string;
  single: string;
  double: string;
  long: string;
  press_release: boolean;
}

export type DimmerState = {
  on: boolean;
  value: number;
  ramp: number;
  disabled: boolean;
  index: {
    relative: number;
    absolute: number;
  };
}

export type DimmersState = {
  "0": DimmerState;
  "1": DimmerState;
  "2": DimmerState;
  "3": DimmerState;
}

export type ShadeState = {
  current: {
    blind: number;
    lamella: number;
  };
  disabled: boolean;
  index: {
    relative: number;
    absolute: number;
  };
}

export type ShadesState = {
  "0": ShadeState;
  "1": ShadeState;
}

export type PirState = {
  success: boolean;
  intensity: number;
  state: string;
  raw: {
    adc0: number;
    adc1: number;
  };
}

export type ActionsState = {
  generic: ActionState;
  btn1: ActionState;
  btn2: ActionState;
  btn3: ActionState;
  btn4: ActionState;
  pir: ActionState;
}

export type PuckVersion = {
  fw: {
    success: boolean;
    version: string;
  };
  hw: {
    success: boolean;
    version: string;
  };
}

export type MotionInfo = {
  success: boolean;
  motion: boolean;
}
