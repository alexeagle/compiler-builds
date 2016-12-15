/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createEnumExpression } from '../compiler_util/identifier_util';
import { Identifiers } from '../identifiers';
import * as o from '../output/output_ast';
export class ViewTypeEnum {
    /**
     * @param {?} value
     * @return {?}
     */
    static fromValue(value) {
        return createEnumExpression(Identifiers.ViewType, value);
    }
}
export class ViewEncapsulationEnum {
    /**
     * @param {?} value
     * @return {?}
     */
    static fromValue(value) {
        return createEnumExpression(Identifiers.ViewEncapsulation, value);
    }
}
export class ChangeDetectionStrategyEnum {
    /**
     * @param {?} value
     * @return {?}
     */
    static fromValue(value) {
        return createEnumExpression(Identifiers.ChangeDetectionStrategy, value);
    }
}
export class ChangeDetectorStatusEnum {
    /**
     * @param {?} value
     * @return {?}
     */
    static fromValue(value) {
        return createEnumExpression(Identifiers.ChangeDetectorStatus, value);
    }
}
export class ViewConstructorVars {
}
ViewConstructorVars.viewUtils = o.variable('viewUtils');
ViewConstructorVars.parentView = o.variable('parentView');
ViewConstructorVars.parentIndex = o.variable('parentIndex');
ViewConstructorVars.parentElement = o.variable('parentElement');
function ViewConstructorVars_tsickle_Closure_declarations() {
    /** @type {?} */
    ViewConstructorVars.viewUtils;
    /** @type {?} */
    ViewConstructorVars.parentView;
    /** @type {?} */
    ViewConstructorVars.parentIndex;
    /** @type {?} */
    ViewConstructorVars.parentElement;
}
export class ViewProperties {
}
ViewProperties.renderer = o.THIS_EXPR.prop('renderer');
ViewProperties.viewUtils = o.THIS_EXPR.prop('viewUtils');
function ViewProperties_tsickle_Closure_declarations() {
    /** @type {?} */
    ViewProperties.renderer;
    /** @type {?} */
    ViewProperties.viewUtils;
}
export class InjectMethodVars {
}
InjectMethodVars.token = o.variable('token');
InjectMethodVars.requestNodeIndex = o.variable('requestNodeIndex');
InjectMethodVars.notFoundResult = o.variable('notFoundResult');
function InjectMethodVars_tsickle_Closure_declarations() {
    /** @type {?} */
    InjectMethodVars.token;
    /** @type {?} */
    InjectMethodVars.requestNodeIndex;
    /** @type {?} */
    InjectMethodVars.notFoundResult;
}
export class DetectChangesVars {
}
DetectChangesVars.throwOnChange = o.variable(`throwOnChange`);
DetectChangesVars.changes = o.variable(`changes`);
DetectChangesVars.changed = o.variable(`changed`);
function DetectChangesVars_tsickle_Closure_declarations() {
    /** @type {?} */
    DetectChangesVars.throwOnChange;
    /** @type {?} */
    DetectChangesVars.changes;
    /** @type {?} */
    DetectChangesVars.changed;
}
//# sourceMappingURL=constants.js.map