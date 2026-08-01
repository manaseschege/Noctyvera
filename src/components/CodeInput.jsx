import { useEffect, useRef, useState } from 'react';

/**
 * The one-time-code box: N separate cells that behave like one field.
 *
 * The fiddly parts are the ones people notice when they are missing —
 * pasting a whole code from the email client, backspacing out of an empty
 * cell into the previous one, and arrow keys moving between cells. Each is a
 * few lines here and a support ticket if left out.
 *
 * Calls `onComplete` as soon as the last cell is filled, so the common case
 * needs no button press at all.
 */
export default function CodeInput({ length = 6, value = '', onChange, onComplete, disabled, autoFocus = true }) {
  const refs = useRef([]);
  const [cells, setCells] = useState(() => spread(value, length));

  // Keep in step when the parent clears the field after a wrong code.
  useEffect(() => {
    setCells(spread(value, length));
  }, [value, length]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const push = (next) => {
    setCells(next);
    const joined = next.join('');
    onChange?.(joined);
    if (joined.length === length && !next.includes('')) onComplete?.(joined);
  };

  const typeInto = (index, raw) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;

    const next = [...cells];
    // One keystroke fills one cell; a paste fills everything from here on.
    for (let i = 0; i < digits.length && index + i < length; i++) {
      next[index + i] = digits[i];
    }
    push(next);

    const landed = Math.min(index + digits.length, length - 1);
    refs.current[landed]?.focus();
  };

  const onKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...cells];
      if (next[index]) {
        // Clear this cell and stay put.
        next[index] = '';
      } else if (index > 0) {
        // Already empty: eat the previous one and move back.
        next[index - 1] = '';
        refs.current[index - 1]?.focus();
      }
      push(next);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="code-input" role="group" aria-label={`${length}-digit code`}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="code-cell"
          value={cells[i] ?? ''}
          onChange={(e) => typeInto(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          // Lets iOS and Android offer the code straight from the SMS/email.
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

function spread(value, length) {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, length).split('');
  return Array.from({ length }, (_, i) => digits[i] ?? '');
}
