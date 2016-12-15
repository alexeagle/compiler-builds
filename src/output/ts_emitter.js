/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { identifierModuleUrl, identifierName } from '../compile_metadata';
import { isBlank, isPresent } from '../facade/lang';
import { AbstractEmitterVisitor, CATCH_ERROR_VAR, CATCH_STACK_VAR, EmitterVisitorContext } from './abstract_emitter';
import * as o from './output_ast';
const /** @type {?} */ _debugModuleUrl = '/debug/lib';
/**
 * @param {?} ast
 * @return {?}
 */
export function debugOutputAstAsTypeScript(ast) {
    const /** @type {?} */ converter = new _TsEmitterVisitor(_debugModuleUrl);
    const /** @type {?} */ ctx = EmitterVisitorContext.createRoot([]);
    const /** @type {?} */ asts = Array.isArray(ast) ? ast : [ast];
    asts.forEach((ast) => {
        if (ast instanceof o.Statement) {
            ast.visitStatement(converter, ctx);
        }
        else if (ast instanceof o.Expression) {
            ast.visitExpression(converter, ctx);
        }
        else if (ast instanceof o.Type) {
            ast.visitType(converter, ctx);
        }
        else {
            throw new Error(`Don't know how to print debug info for ${ast}`);
        }
    });
    return ctx.toSource();
}
export class TypeScriptEmitter {
    /**
     * @param {?} _importGenerator
     */
    constructor(_importGenerator) {
        this._importGenerator = _importGenerator;
    }
    /**
     * @param {?} moduleUrl
     * @param {?} stmts
     * @param {?} exportedVars
     * @return {?}
     */
    emitStatements(moduleUrl, stmts, exportedVars) {
        const /** @type {?} */ converter = new _TsEmitterVisitor(moduleUrl);
        const /** @type {?} */ ctx = EmitterVisitorContext.createRoot(exportedVars);
        converter.visitAllStatements(stmts, ctx);
        const /** @type {?} */ srcParts = [];
        converter.importsWithPrefixes.forEach((prefix, importedModuleUrl) => {
            // Note: can't write the real word for import as it screws up system.js auto detection...
            srcParts.push(`imp` +
                `ort * as ${prefix} from '${this._importGenerator.fileNameToModuleName(importedModuleUrl, moduleUrl)}';`);
        });
        srcParts.push(ctx.toSource());
        return srcParts.join('\n');
    }
}
function TypeScriptEmitter_tsickle_Closure_declarations() {
    /** @type {?} */
    TypeScriptEmitter.prototype._importGenerator;
}
class _TsEmitterVisitor extends AbstractEmitterVisitor {
    /**
     * @param {?} _moduleUrl
     */
    constructor(_moduleUrl) {
        super(false);
        this._moduleUrl = _moduleUrl;
        this.importsWithPrefixes = new Map();
    }
    /**
     * @param {?} t
     * @param {?} ctx
     * @param {?=} defaultType
     * @return {?}
     */
    visitType(t, ctx, defaultType = 'any') {
        if (isPresent(t)) {
            t.visitType(this, ctx);
        }
        else {
            ctx.print(defaultType);
        }
    }
    /**
     * @param {?} ast
     * @param {?} ctx
     * @return {?}
     */
    visitLiteralExpr(ast, ctx) {
        const /** @type {?} */ value = ast.value;
        if (isBlank(value) && ast.type != o.NULL_TYPE) {
            ctx.print(`(${value} as any)`);
            return null;
        }
        return super.visitLiteralExpr(ast, ctx);
    }
    /**
     * @param {?} ast
     * @param {?} ctx
     * @return {?}
     */
    visitLiteralArrayExpr(ast, ctx) {
        if (ast.entries.length === 0) {
            ctx.print('(');
        }
        const /** @type {?} */ result = super.visitLiteralArrayExpr(ast, ctx);
        if (ast.entries.length === 0) {
            ctx.print(' as any[])');
        }
        return result;
    }
    /**
     * @param {?} ast
     * @param {?} ctx
     * @return {?}
     */
    visitExternalExpr(ast, ctx) {
        this._visitIdentifier(ast.value, ast.typeParams, ctx);
        return null;
    }
    /**
     * @param {?} stmt
     * @param {?} ctx
     * @return {?}
     */
    visitDeclareVarStmt(stmt, ctx) {
        if (ctx.isExportedVar(stmt.name)) {
            ctx.print(`export `);
        }
        if (stmt.hasModifier(o.StmtModifier.Final)) {
            ctx.print(`const`);
        }
        else {
            ctx.print(`var`);
        }
        ctx.print(` ${stmt.name}:`);
        this.visitType(stmt.type, ctx);
        ctx.print(` = `);
        stmt.value.visitExpression(this, ctx);
        ctx.println(`;`);
        return null;
    }
    /**
     * @param {?} ast
     * @param {?} ctx
     * @return {?}
     */
    visitCastExpr(ast, ctx) {
        ctx.print(`(<`);
        ast.type.visitType(this, ctx);
        ctx.print(`>`);
        ast.value.visitExpression(this, ctx);
        ctx.print(`)`);
        return null;
    }
    /**
     * @param {?} stmt
     * @param {?} ctx
     * @return {?}
     */
    visitDeclareClassStmt(stmt, ctx) {
        ctx.pushClass(stmt);
        if (ctx.isExportedVar(stmt.name)) {
            ctx.print(`export `);
        }
        ctx.print(`class ${stmt.name}`);
        if (isPresent(stmt.parent)) {
            ctx.print(` extends `);
            stmt.parent.visitExpression(this, ctx);
        }
        ctx.println(` {`);
        ctx.incIndent();
        stmt.fields.forEach((field) => this._visitClassField(field, ctx));
        if (isPresent(stmt.constructorMethod)) {
            this._visitClassConstructor(stmt, ctx);
        }
        stmt.getters.forEach((getter) => this._visitClassGetter(getter, ctx));
        stmt.methods.forEach((method) => this._visitClassMethod(method, ctx));
        ctx.decIndent();
        ctx.println(`}`);
        ctx.popClass();
        return null;
    }
    /**
     * @param {?} field
     * @param {?} ctx
     * @return {?}
     */
    _visitClassField(field, ctx) {
        if (field.hasModifier(o.StmtModifier.Private)) {
            // comment out as a workaround for #10967
            ctx.print(`/*private*/ `);
        }
        ctx.print(field.name);
        ctx.print(':');
        this.visitType(field.type, ctx);
        ctx.println(`;`);
    }
    /**
     * @param {?} getter
     * @param {?} ctx
     * @return {?}
     */
    _visitClassGetter(getter, ctx) {
        if (getter.hasModifier(o.StmtModifier.Private)) {
            ctx.print(`private `);
        }
        ctx.print(`get ${getter.name}()`);
        ctx.print(':');
        this.visitType(getter.type, ctx);
        ctx.println(` {`);
        ctx.incIndent();
        this.visitAllStatements(getter.body, ctx);
        ctx.decIndent();
        ctx.println(`}`);
    }
    /**
     * @param {?} stmt
     * @param {?} ctx
     * @return {?}
     */
    _visitClassConstructor(stmt, ctx) {
        ctx.print(`constructor(`);
        this._visitParams(stmt.constructorMethod.params, ctx);
        ctx.println(`) {`);
        ctx.incIndent();
        this.visitAllStatements(stmt.constructorMethod.body, ctx);
        ctx.decIndent();
        ctx.println(`}`);
    }
    /**
     * @param {?} method
     * @param {?} ctx
     * @return {?}
     */
    _visitClassMethod(method, ctx) {
        if (method.hasModifier(o.StmtModifier.Private)) {
            ctx.print(`private `);
        }
        ctx.print(`${method.name}(`);
        this._visitParams(method.params, ctx);
        ctx.print(`):`);
        this.visitType(method.type, ctx, 'void');
        ctx.println(` {`);
        ctx.incIndent();
        this.visitAllStatements(method.body, ctx);
        ctx.decIndent();
        ctx.println(`}`);
    }
    /**
     * @param {?} ast
     * @param {?} ctx
     * @return {?}
     */
    visitFunctionExpr(ast, ctx) {
        ctx.print(`(`);
        this._visitParams(ast.params, ctx);
        ctx.print(`):`);
        this.visitType(ast.type, ctx, 'void');
        ctx.println(` => {`);
        ctx.incIndent();
        this.visitAllStatements(ast.statements, ctx);
        ctx.decIndent();
        ctx.print(`}`);
        return null;
    }
    /**
     * @param {?} stmt
     * @param {?} ctx
     * @return {?}
     */
    visitDeclareFunctionStmt(stmt, ctx) {
        if (ctx.isExportedVar(stmt.name)) {
            ctx.print(`export `);
        }
        ctx.print(`function ${stmt.name}(`);
        this._visitParams(stmt.params, ctx);
        ctx.print(`):`);
        this.visitType(stmt.type, ctx, 'void');
        ctx.println(` {`);
        ctx.incIndent();
        this.visitAllStatements(stmt.statements, ctx);
        ctx.decIndent();
        ctx.println(`}`);
        return null;
    }
    /**
     * @param {?} stmt
     * @param {?} ctx
     * @return {?}
     */
    visitTryCatchStmt(stmt, ctx) {
        ctx.println(`try {`);
        ctx.incIndent();
        this.visitAllStatements(stmt.bodyStmts, ctx);
        ctx.decIndent();
        ctx.println(`} catch (${CATCH_ERROR_VAR.name}) {`);
        ctx.incIndent();
        const /** @type {?} */ catchStmts = [(CATCH_STACK_VAR.set(CATCH_ERROR_VAR.prop('stack')).toDeclStmt(null, [
                o.StmtModifier.Final
            ]))].concat(stmt.catchStmts);
        this.visitAllStatements(catchStmts, ctx);
        ctx.decIndent();
        ctx.println(`}`);
        return null;
    }
    /**
     * @param {?} type
     * @param {?} ctx
     * @return {?}
     */
    visitBuiltintType(type, ctx) {
        let /** @type {?} */ typeStr;
        switch (type.name) {
            case o.BuiltinTypeName.Bool:
                typeStr = 'boolean';
                break;
            case o.BuiltinTypeName.Dynamic:
                typeStr = 'any';
                break;
            case o.BuiltinTypeName.Function:
                typeStr = 'Function';
                break;
            case o.BuiltinTypeName.Number:
                typeStr = 'number';
                break;
            case o.BuiltinTypeName.Int:
                typeStr = 'number';
                break;
            case o.BuiltinTypeName.String:
                typeStr = 'string';
                break;
            default:
                throw new Error(`Unsupported builtin type ${type.name}`);
        }
        ctx.print(typeStr);
        return null;
    }
    /**
     * @param {?} ast
     * @param {?} ctx
     * @return {?}
     */
    visitExpressionType(ast, ctx) {
        ast.value.visitExpression(this, ctx);
        if (isPresent(ast.typeParams) && ast.typeParams.length > 0) {
            ctx.print(`<`);
            this.visitAllObjects(type => type.visitType(this, ctx), ast.typeParams, ctx, ',');
            ctx.print(`>`);
        }
        return null;
    }
    /**
     * @param {?} type
     * @param {?} ctx
     * @return {?}
     */
    visitArrayType(type, ctx) {
        this.visitType(type.of, ctx);
        ctx.print(`[]`);
        return null;
    }
    /**
     * @param {?} type
     * @param {?} ctx
     * @return {?}
     */
    visitMapType(type, ctx) {
        ctx.print(`{[key: string]:`);
        this.visitType(type.valueType, ctx);
        ctx.print(`}`);
        return null;
    }
    /**
     * @param {?} method
     * @return {?}
     */
    getBuiltinMethodName(method) {
        let /** @type {?} */ name;
        switch (method) {
            case o.BuiltinMethod.ConcatArray:
                name = 'concat';
                break;
            case o.BuiltinMethod.SubscribeObservable:
                name = 'subscribe';
                break;
            case o.BuiltinMethod.Bind:
                name = 'bind';
                break;
            default:
                throw new Error(`Unknown builtin method: ${method}`);
        }
        return name;
    }
    /**
     * @param {?} params
     * @param {?} ctx
     * @return {?}
     */
    _visitParams(params, ctx) {
        this.visitAllObjects(param => {
            ctx.print(param.name);
            ctx.print(':');
            this.visitType(param.type, ctx);
        }, params, ctx, ',');
    }
    /**
     * @param {?} value
     * @param {?} typeParams
     * @param {?} ctx
     * @return {?}
     */
    _visitIdentifier(value, typeParams, ctx) {
        const /** @type {?} */ name = identifierName(value);
        const /** @type {?} */ moduleUrl = identifierModuleUrl(value);
        if (isBlank(name)) {
            throw new Error(`Internal error: unknown identifier ${value}`);
        }
        if (isPresent(moduleUrl) && moduleUrl != this._moduleUrl) {
            let /** @type {?} */ prefix = this.importsWithPrefixes.get(moduleUrl);
            if (isBlank(prefix)) {
                prefix = `import${this.importsWithPrefixes.size}`;
                this.importsWithPrefixes.set(moduleUrl, prefix);
            }
            ctx.print(`${prefix}.`);
        }
        if (value.reference && value.reference.members) {
            ctx.print(value.reference.name);
            ctx.print('.');
            ctx.print(value.reference.members.join('.'));
        }
        else {
            ctx.print(name);
        }
        if (isPresent(typeParams) && typeParams.length > 0) {
            ctx.print(`<`);
            this.visitAllObjects(type => type.visitType(this, ctx), typeParams, ctx, ',');
            ctx.print(`>`);
        }
    }
}
function _TsEmitterVisitor_tsickle_Closure_declarations() {
    /** @type {?} */
    _TsEmitterVisitor.prototype.importsWithPrefixes;
    /** @type {?} */
    _TsEmitterVisitor.prototype._moduleUrl;
}
//# sourceMappingURL=ts_emitter.js.map