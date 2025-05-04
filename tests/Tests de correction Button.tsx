import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React, { useState } from 'react'

function ButtonTest() {
  const [count, setCount] = useState(0)
  return (
    <button onClick={() => setCount(count + 1)}>
      Cliquez {count} fois
    </button>
  )
}

describe('ButtonTest', () => {
  it('doit incrémenter le compteur au clic', () => {
    render(<ButtonTest />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Cliquez 0 fois')
    fireEvent.click(button)
    expect(button).toHaveTextContent('Cliquez 1 fois')
  })
})