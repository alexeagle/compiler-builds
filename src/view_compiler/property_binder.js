/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createCheckBindingField, createCheckBindingStmt } from '../compiler_util/binding_util';
import { convertPropertyBinding } from '../compiler_util/expression_converter';
import { createEnumExpression } from '../compiler_util/identifier_util';
import { triggerAnimation, writeToRenderer } from '../compiler_util/render_util';
import { DirectiveWrapperExpressions } from '../directive_wrapper_compiler';
import { Identifiers, createIdentifier } from '../identifiers';
import * as o from '../output/output_ast';
import { isDefaultChangeDetectionStrategy } from '../private_import_core';
import { PropertyBindingType } from '../template_parser/template_ast';
import { DetectChangesVars } from './constants';
import { getHandleEventMethodName } from './util';
/**
 * @param {?} boundText
 * @param {?} compileNode
 * @param {?} view
 * @return {?}
 */
export function bindRenderText(boundText, compileNode, view) {
    const /** @type {?} */ valueField = createCheckBindingField(view);
    const /** @type {?} */ evalResult = convertPropertyBinding(view, view, view.componentContext, boundText.value, valueField.bindingId);
    if (!evalResult) {
        return null;
    }
    view.detectChangesRenderPropertiesMethod.resetDebugInfo(compileNode.nodeIndex, boundText);
    view.detectChangesRenderPropertiesMethod.addStmts(createCheckBindingStmt(evalResult, valueField.expression, DetectChangesVars.throwOnChange, [o.THIS_EXPR.prop('renderer')
            .callMethod('setText', [compileNode.renderNode, evalResult.currValExpr])
            .toStmt()]));
}
/**
 * @param {?} boundProps
 * @param {?} boundOutputs
 * @param {?} hasEvents
 * @param {?} compileElement
 * @return {?}
 */
export function bindRenderInputs(boundProps, boundOutputs, hasEvents, compileElement) {
    const /** @type {?} */ view = compileElement.view;
    const /** @type {?} */ renderNode = compileElement.renderNode;
    boundProps.forEach((boundProp) => {
        const /** @type {?} */ bindingField = createCheckBindingField(view);
        view.detectChangesRenderPropertiesMethod.resetDebugInfo(compileElement.nodeIndex, boundProp);
        const /** @type {?} */ evalResult = convertPropertyBinding(view, view, compileElement.view.componentContext, boundProp.value, bindingField.bindingId);
        if (!evalResult) {
            return;
        }
        const /** @type {?} */ checkBindingStmts = [];
        let /** @type {?} */ compileMethod = view.detectChangesRenderPropertiesMethod;
        switch (boundProp.type) {
            case PropertyBindingType.Property:
            case PropertyBindingType.Attribute:
            case PropertyBindingType.Class:
            case PropertyBindingType.Style:
                checkBindingStmts.push(...writeToRenderer(o.THIS_EXPR, boundProp, renderNode, evalResult.currValExpr, view.genConfig.logBindingUpdate));
                break;
            case PropertyBindingType.Animation:
                compileMethod = view.animationBindingsMethod;
                const { updateStmts, detachStmts } = triggerAnimation(o.THIS_EXPR, o.THIS_EXPR, boundProp, boundOutputs, (hasEvents ? o.THIS_EXPR.prop(getHandleEventMethodName(compileElement.nodeIndex)) :
                    o.importExpr(createIdentifier(Identifiers.noop)))
                    .callMethod(o.BuiltinMethod.Bind, [o.THIS_EXPR]), compileElement.renderNode, evalResult.currValExpr, bindingField.expression);
                checkBindingStmts.push(...updateStmts);
                view.detachMethod.addStmts(detachStmts);
                break;
        }
        compileMethod.addStmts(createCheckBindingStmt(evalResult, bindingField.expression, DetectChangesVars.throwOnChange, checkBindingStmts));
    });
}
/**
 * @param {?} directiveAst
 * @param {?} directiveWrapperInstance
 * @param {?} compileElement
 * @param {?} elementName
 * @param {?} schemaRegistry
 * @return {?}
 */
export function bindDirectiveHostProps(directiveAst, directiveWrapperInstance, compileElement, elementName, schemaRegistry) {
    // We need to provide the SecurityContext for properties that could need sanitization.
    const /** @type {?} */ runtimeSecurityCtxExprs = directiveAst.hostProperties.filter(boundProp => boundProp.needsRuntimeSecurityContext)
        .map((boundProp) => {
        let /** @type {?} */ ctx;
        switch (boundProp.type) {
            case PropertyBindingType.Property:
                ctx = schemaRegistry.securityContext(elementName, boundProp.name, false);
                break;
            case PropertyBindingType.Attribute:
                ctx = schemaRegistry.securityContext(elementName, boundProp.name, true);
                break;
            default:
                throw new Error(`Illegal state: Only property / attribute bindings can have an unknown security context! Binding ${boundProp.name}`);
        }
        return createEnumExpression(Identifiers.SecurityContext, ctx);
    });
    compileElement.view.detectChangesRenderPropertiesMethod.addStmts(DirectiveWrapperExpressions.checkHost(directiveAst.hostProperties, directiveWrapperInstance, o.THIS_EXPR, compileElement.compViewExpr || o.THIS_EXPR, compileElement.renderNode, DetectChangesVars.throwOnChange, runtimeSecurityCtxExprs));
}
/**
 * @param {?} directiveAst
 * @param {?} directiveWrapperInstance
 * @param {?} dirIndex
 * @param {?} compileElement
 * @return {?}
 */
export function bindDirectiveInputs(directiveAst, directiveWrapperInstance, dirIndex, compileElement) {
    const /** @type {?} */ view = compileElement.view;
    const /** @type {?} */ detectChangesInInputsMethod = view.detectChangesInInputsMethod;
    detectChangesInInputsMethod.resetDebugInfo(compileElement.nodeIndex, compileElement.sourceAst);
    directiveAst.inputs.forEach((input, inputIdx) => {
        // Note: We can't use `fields.length` here, as we are not adding a field!
        const /** @type {?} */ bindingId = `${compileElement.nodeIndex}_${dirIndex}_${inputIdx}`;
        detectChangesInInputsMethod.resetDebugInfo(compileElement.nodeIndex, input);
        const /** @type {?} */ evalResult = convertPropertyBinding(view, view, view.componentContext, input.value, bindingId);
        if (!evalResult) {
            return;
        }
        detectChangesInInputsMethod.addStmts(evalResult.stmts);
        detectChangesInInputsMethod.addStmt(directiveWrapperInstance
            .callMethod(`check_${input.directiveName}`, [
            evalResult.currValExpr, DetectChangesVars.throwOnChange,
            evalResult.forceUpdate || o.literal(false)
        ])
            .toStmt());
    });
    const /** @type {?} */ isOnPushComp = directiveAst.directive.isComponent &&
        !isDefaultChangeDetectionStrategy(directiveAst.directive.changeDetection);
    const /** @type {?} */ directiveDetectChangesExpr = DirectiveWrapperExpressions.ngDoCheck(directiveWrapperInstance, o.THIS_EXPR, compileElement.renderNode, DetectChangesVars.throwOnChange);
    const /** @type {?} */ directiveDetectChangesStmt = isOnPushComp ?
        new o.IfStmt(directiveDetectChangesExpr, [compileElement.compViewExpr.callMethod('markAsCheckOnce', []).toStmt()]) :
        directiveDetectChangesExpr.toStmt();
    detectChangesInInputsMethod.addStmt(directiveDetectChangesStmt);
}
//# sourceMappingURL=property_binder.js.map