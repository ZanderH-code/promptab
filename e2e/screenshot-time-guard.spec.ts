import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as ts from 'typescript'
import { expect, test } from '@playwright/test'

const e2e = resolve(process.cwd(), 'e2e')
const files = readdirSync(e2e).filter(file => file.endsWith('.spec.ts') && file !== 'screenshot-time-guard.spec.ts')
const fixedClock = /\.clock\.(?:install|setFixedTime)\s*\(/

function propertyName(call: ts.CallExpression) {
  return ts.isPropertyAccessExpression(call.expression) ? call.expression.name.text : ''
}

function testCallback(call: ts.CallExpression) {
  if (!ts.isIdentifier(call.expression) || call.expression.text !== 'test') return null
  const title = call.arguments[0]
  const callback = call.arguments[1]
  return title && (ts.isStringLiteral(title) || ts.isTemplateExpression(title) || ts.isNoSubstitutionTemplateLiteral(title)) && callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) ? callback : null
}

function screenshotCall(node: ts.Node) {
  return ts.isCallExpression(node) && ['toHaveScreenshot', 'screenshot'].includes(propertyName(node))
}

function callName(node: ts.CallExpression) {
  return ts.isIdentifier(node.expression) ? node.expression.text : ''
}

function references(node: ts.Node, definitions: Map<string, ts.Node>, predicate: (node: ts.Node) => boolean, seen = new Set<string>()): boolean {
  if (predicate(node)) return true
  let matched = false
  function visit(child: ts.Node) {
    if (matched) return
    if (ts.isCallExpression(child)) {
      const name = callName(child)
      const definition = definitions.get(name)
      if (definition && !seen.has(name) && references(definition, definitions, predicate, new Set(seen).add(name))) {
        matched = true
        return
      }
    }
    ts.forEachChild(child, visit)
  }
  ts.forEachChild(node, visit)
  return matched
}

function containsClock(node: ts.Node) {
  return fixedClock.test(node.getText())
}

function containsScreenshot(node: ts.Node) {
  let matched = false
  function visit(child: ts.Node) {
    if (matched) return
    if (screenshotCall(child)) { matched = true; return }
    ts.forEachChild(child, visit)
  }
  visit(node)
  return matched
}

function helperDefinitions(source: ts.SourceFile) {
  const definitions = new Map<string, ts.Node>()
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) definitions.set(statement.name.text, statement)
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) definitions.set(declaration.name.text, declaration.initializer)
    }
  }
  return definitions
}

function auditFile(file: string) {
  const path = resolve(e2e, file)
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
  const definitions = helperDefinitions(source)
  const tests: ts.Node[] = []
  const hooks: ts.Node[] = []
  const screenshots: ts.Node[] = []
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const callback = testCallback(node)
      if (callback) tests.push(callback)
      if (propertyName(node) === 'beforeEach') {
        const hook = node.arguments.find(argument => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument))
        if (hook) hooks.push(hook)
      }
      if (screenshotCall(node)) screenshots.push(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  const unscopedScreenshot = screenshots.some(node => !tests.some(body => body.pos <= node.pos && node.end <= body.end))

  const screenshotTests = tests.filter(body => references(body, definitions, containsScreenshot))
  const fixedByHook = hooks.some(hook => references(hook, definitions, containsClock))
  const missing = screenshotTests.filter(body => !references(body, definitions, containsClock) && !fixedByHook)
  return { file, unscopedScreenshot, missing: missing.length }
}

test('every screenshot test fixes the page clock before capture', () => {
  const failures = files.map(auditFile).filter(result => result.unscopedScreenshot || result.missing > 0)
  expect(failures, 'freeze page.clock before navigating in every screenshot test').toEqual([])
})
