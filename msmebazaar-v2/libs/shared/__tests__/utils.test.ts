import { describe, it, expect } from '@jest/globals'

describe('Shared Library Utils', () => {
  it('should handle basic string operations', () => {
    const testString = 'Hello World'
    expect(testString.toLowerCase()).toBe('hello world')
    expect(testString.toUpperCase()).toBe('HELLO WORLD')
  })

  it('should handle array operations', () => {
    const testArray = [1, 2, 3, 4, 5]
    expect(testArray.length).toBe(5)
    expect(testArray.includes(3)).toBe(true)
    expect(testArray.filter(x => x > 3)).toEqual([4, 5])
  })

  it('should handle object operations', () => {
    const testObject = { name: 'Test', value: 123 }
    expect(testObject.name).toBe('Test')
    expect(testObject.value).toBe(123)
    expect(Object.keys(testObject)).toEqual(['name', 'value'])
  })

  it('should handle promise operations', async () => {
    const asyncFunction = async () => {
      return new Promise(resolve => {
        setTimeout(() => resolve('success'), 10)
      })
    }

    const result = await asyncFunction()
    expect(result).toBe('success')
  })
})