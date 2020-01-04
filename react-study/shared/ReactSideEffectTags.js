/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Don't change these two values. They're used by React Dev Tools.
export const NoEffect = /*              */ 0b0000000000000; // 没有更新
export const PerformedWork = /*         */ 0b0000000000001; // 

// You can change the rest (and add more).
export const Placement = /*             */ 0b0000000000010; // 新增
export const Update = /*                */ 0b0000000000100; // 更新
export const PlacementAndUpdate = /*    */ 0b0000000000110; // 新增&更新
export const Deletion = /*              */ 0b0000000001000; // 删除
export const ContentReset = /*          */ 0b0000000010000; // 重置content
export const Callback = /*              */ 0b0000000100000; // 回调？
export const DidCapture = /*            */ 0b0000001000000; // 错误捕获
export const Ref = /*                   */ 0b0000010000000; // ref
export const Snapshot = /*              */ 0b0000100000000; // snapshot
export const Passive = /*               */ 0b0001000000000; // 
export const Hydrating = /*             */ 0b0010000000000; // 注水
export const HydratingAndUpdate = /*    */ 0b0010000000100;

// Passive & Update & Callback & Ref & Snapshot
export const LifecycleEffectMask = /*   */ 0b0001110100100;

// Union of all host effects
export const HostEffectMask = /*        */ 0b0011111111111;

export const Incomplete = /*            */ 0b0100000000000;
export const ShouldCapture = /*         */ 0b1000000000000;
