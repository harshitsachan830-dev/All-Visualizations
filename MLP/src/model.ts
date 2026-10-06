import type { Dataset } from './data'

export type Model = { w1: number[][]; b1: number[]; w2: number[][]; b2: number[]; w3: number[][]; b3: number[] }
export type ForwardResult = { layers: number[][]; z1: number[]; z2: number[] }

export function createModel(inputCount: number, outputCount: number): Model {
  let seed = 41
  const random = () => { seed = seed * 16807 % 2147483647; return (seed / 2147483647 - 0.5) * 0.5 }
  const matrix = (rows: number, columns: number) => Array.from({ length: rows }, () => Array.from({ length: columns }, random))
  return { w1: matrix(8, inputCount), b1: Array(8).fill(0), w2: matrix(6, 8), b2: Array(6).fill(0), w3: matrix(outputCount, 6), b3: Array(outputCount).fill(0) }
}

export function forward(model: Model, input: number[]): ForwardResult {
  const z1 = model.w1.map((row, index) => row.reduce((sum, weight, i) => sum + weight * input[i], model.b1[index]))
  const a1 = z1.map((value) => Math.max(0, value))
  const z2 = model.w2.map((row, index) => row.reduce((sum, weight, i) => sum + weight * a1[i], model.b2[index]))
  const a2 = z2.map((value) => Math.max(0, value))
  const logits = model.w3.map((row, index) => row.reduce((sum, weight, i) => sum + weight * a2[i], model.b3[index]))
  const exp = logits.map((value) => Math.exp(value - Math.max(...logits)))
  const total = exp.reduce((sum, value) => sum + value, 0)
  return { layers: [input, a1, a2, exp.map((value) => value / total)], z1, z2 }
}

export function trainEpoch(model: Model, dataset: Dataset, learningRate: number) {
  const indexes = dataset.trainingIndices.length ? dataset.trainingIndices : dataset.x.map((_, index) => index)
  const count = Math.min(indexes.length, 1200)
  let loss = 0
  let correct = 0
  for (let sample = 0; sample < count; sample += 1) {
    const rowIndex = indexes[sample]
    const input = dataset.x[rowIndex]
    const output = forward(model, input)
    const probabilities = output.layers[3]
    const truth = dataset.y[rowIndex]
    loss -= Math.log(Math.max(probabilities[truth], 1e-8))
    if (probabilities.indexOf(Math.max(...probabilities)) === truth) correct += 1
    const delta3 = probabilities.map((value, index) => value - (index === truth ? 1 : 0))
    const delta2 = model.b2.map((_, neuron) => output.z2[neuron] > 0 ? model.w3.reduce((sum, row, index) => sum + row[neuron] * delta3[index], 0) : 0)
    const delta1 = model.b1.map((_, neuron) => output.z1[neuron] > 0 ? model.w2.reduce((sum, row, index) => sum + row[neuron] * delta2[index], 0) : 0)
    for (let classIndex = 0; classIndex < model.w3.length; classIndex += 1) {
      for (let neuron = 0; neuron < model.w3[classIndex].length; neuron += 1) model.w3[classIndex][neuron] -= learningRate * delta3[classIndex] * output.layers[2][neuron]
      model.b3[classIndex] -= learningRate * delta3[classIndex]
    }
    for (let neuron = 0; neuron < model.w2.length; neuron += 1) {
      for (let source = 0; source < model.w2[neuron].length; source += 1) model.w2[neuron][source] -= learningRate * delta2[neuron] * output.layers[1][source]
      model.b2[neuron] -= learningRate * delta2[neuron]
    }
    for (let neuron = 0; neuron < model.w1.length; neuron += 1) {
      for (let source = 0; source < model.w1[neuron].length; source += 1) model.w1[neuron][source] -= learningRate * delta1[neuron] * input[source]
      model.b1[neuron] -= learningRate * delta1[neuron]
    }
  }
  return { loss: loss / count, accuracy: correct / count }
}

export function evaluateModel(model: Model, dataset: Dataset, subset: 'training' | 'validation' = 'validation') {
  const indexes = subset === 'training' ? dataset.trainingIndices : dataset.validationIndices.length ? dataset.validationIndices : dataset.trainingIndices
  const count = Math.min(indexes.length, 1200)
  let loss = 0
  let correct = 0
  for (const rowIndex of indexes.slice(0, count)) {
    const probabilities = forward(model, dataset.x[rowIndex]).layers[3]
    const truth = dataset.y[rowIndex]
    loss -= Math.log(Math.max(probabilities[truth], 1e-8))
    if (probabilities.indexOf(Math.max(...probabilities)) === truth) correct += 1
  }
  return { loss: loss / count, accuracy: correct / count }
}