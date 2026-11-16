package calculator

import (
	"errors"
	"fmt"
	"math"
)

// Errors returned by Calculate. Callers should match them with errors.Is;
// the returned error may wrap them with additional detail.
var (
	ErrUnsupportedOperation = errors.New("unsupported operation")
	ErrInvalidOperandCount  = errors.New("invalid operand count")
	ErrNonFiniteOperand     = errors.New("operands must be finite numbers")
	ErrDivisionByZero       = errors.New("cannot divide by zero")
	ErrNegativeSquareRoot   = errors.New("cannot take the square root of a negative number")
	ErrResultNotFinite      = errors.New("result is not a finite number")
)

type operation struct {
	arity int
	apply func(x []float64) (float64, error)
}

var operations = map[string]operation{
	"add":      {2, func(x []float64) (float64, error) { return x[0] + x[1], nil }},
	"subtract": {2, func(x []float64) (float64, error) { return x[0] - x[1], nil }},
	"multiply": {2, func(x []float64) (float64, error) { return x[0] * x[1], nil }},
	"divide": {2, func(x []float64) (float64, error) {
		if x[1] == 0 {
			return 0, ErrDivisionByZero
		}
		return x[0] / x[1], nil
	}},
	// Follows math.Pow, so power(0, 0) = 1. Cases with no finite real result,
	// such as power(0, -1) or power(-8, 0.5), are rejected by Calculate.
	"power": {2, func(x []float64) (float64, error) { return math.Pow(x[0], x[1]), nil }},
	"sqrt": {1, func(x []float64) (float64, error) {
		if x[0] < 0 {
			return 0, ErrNegativeSquareRoot
		}
		return math.Sqrt(x[0]), nil
	}},
	// percentage(a, b) is b percent of a: percentage(200, 10) = 20.
	"percentage": {2, func(x []float64) (float64, error) { return x[0] * x[1] / 100, nil }},
}

// Calculate applies the named operation to operands. It rejects unknown
// operations, wrong operand counts, non-finite operands, and any result that
// is not a finite number (overflow or NaN).
func Calculate(op string, operands []float64) (float64, error) {
	o, ok := operations[op]
	if !ok {
		return 0, fmt.Errorf("%w: %q", ErrUnsupportedOperation, op)
	}
	if len(operands) != o.arity {
		return 0, fmt.Errorf("%w: %s expects %d operand(s), got %d", ErrInvalidOperandCount, op, o.arity, len(operands))
	}
	for _, v := range operands {
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return 0, ErrNonFiniteOperand
		}
	}

	result, err := o.apply(operands)
	if err != nil {
		return 0, err
	}
	if math.IsNaN(result) || math.IsInf(result, 0) {
		return 0, ErrResultNotFinite
	}
	// Normalise -0 to 0 so clients never display "-0".
	if result == 0 {
		result = 0
	}
	return result, nil
}
