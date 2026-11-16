package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name     string
		op       string
		operands []float64
		want     float64
	}{
		{"add", "add", []float64{10, 5}, 15},
		{"add negatives", "add", []float64{-3, -4}, -7},
		{"add zero", "add", []float64{0, 0}, 0},
		{"add decimals", "add", []float64{0.1, 0.2}, 0.30000000000000004},
		{"subtract", "subtract", []float64{10, 5}, 5},
		{"subtract to negative", "subtract", []float64{5, 10}, -5},
		{"subtract decimals", "subtract", []float64{1.5, 0.25}, 1.25},
		{"multiply", "multiply", []float64{10, 5}, 50},
		{"multiply mixed signs", "multiply", []float64{-3, 4}, -12},
		{"multiply by zero", "multiply", []float64{123.45, 0}, 0},
		{"multiply negative by zero is not -0", "multiply", []float64{-1, 0}, 0},
		{"multiply decimals", "multiply", []float64{2.5, 0.4}, 1},
		{"divide", "divide", []float64{10, 4}, 2.5},
		{"divide negatives", "divide", []float64{-9, -3}, 3},
		{"divide zero by number", "divide", []float64{0, 5}, 0},
		{"power", "power", []float64{2, 10}, 1024},
		{"power negative exponent", "power", []float64{2, -2}, 0.25},
		{"power fractional exponent", "power", []float64{9, 0.5}, 3},
		{"power negative base odd exponent", "power", []float64{-2, 3}, -8},
		{"power zero to zero is 1", "power", []float64{0, 0}, 1},
		{"power zero exponent", "power", []float64{-5, 0}, 1},
		{"sqrt", "sqrt", []float64{16}, 4},
		{"sqrt decimal", "sqrt", []float64{2.25}, 1.5},
		{"sqrt zero", "sqrt", []float64{0}, 0},
		{"sqrt negative zero", "sqrt", []float64{math.Copysign(0, -1)}, 0},
		{"percentage", "percentage", []float64{200, 10}, 20},
		{"percentage decimal", "percentage", []float64{50, 12.5}, 6.25},
		{"percentage negative", "percentage", []float64{-200, 10}, -20},
		{"percentage of zero", "percentage", []float64{0, 50}, 0},
		{"very large but finite", "multiply", []float64{1e154, 1e154}, 1e308},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.operands)
			if err != nil {
				t.Fatalf("Calculate(%q, %v) error = %v", tt.op, tt.operands, err)
			}
			if got != tt.want || math.Signbit(got) != math.Signbit(tt.want) {
				t.Errorf("Calculate(%q, %v) = %v, want %v", tt.op, tt.operands, got, tt.want)
			}
		})
	}
}

func TestCalculateErrors(t *testing.T) {
	inf, nan := math.Inf(1), math.NaN()
	tests := []struct {
		name     string
		op       string
		operands []float64
		want     error
	}{
		{"unknown operation", "modulo", []float64{1, 2}, ErrUnsupportedOperation},
		{"empty operation", "", []float64{1, 2}, ErrUnsupportedOperation},
		{"operation is case sensitive", "ADD", []float64{1, 2}, ErrUnsupportedOperation},
		{"too few operands", "add", []float64{1}, ErrInvalidOperandCount},
		{"too many operands", "add", []float64{1, 2, 3}, ErrInvalidOperandCount},
		{"no operands", "subtract", nil, ErrInvalidOperandCount},
		{"sqrt with two operands", "sqrt", []float64{4, 2}, ErrInvalidOperandCount},
		{"sqrt with no operands", "sqrt", []float64{}, ErrInvalidOperandCount},
		{"NaN operand", "add", []float64{nan, 1}, ErrNonFiniteOperand},
		{"+Inf operand", "multiply", []float64{1, inf}, ErrNonFiniteOperand},
		{"-Inf operand", "sqrt", []float64{-inf}, ErrNonFiniteOperand},
		{"divide by zero", "divide", []float64{1, 0}, ErrDivisionByZero},
		{"divide zero by zero", "divide", []float64{0, 0}, ErrDivisionByZero},
		{"divide by negative zero", "divide", []float64{1, math.Copysign(0, -1)}, ErrDivisionByZero},
		{"negative square root", "sqrt", []float64{-4}, ErrNegativeSquareRoot},
		{"add overflow", "add", []float64{math.MaxFloat64, math.MaxFloat64}, ErrResultNotFinite},
		{"subtract overflow", "subtract", []float64{-math.MaxFloat64, math.MaxFloat64}, ErrResultNotFinite},
		{"multiply overflow", "multiply", []float64{1e308, 10}, ErrResultNotFinite},
		{"divide overflow", "divide", []float64{1e308, 1e-10}, ErrResultNotFinite},
		{"power overflow", "power", []float64{10, 309}, ErrResultNotFinite},
		{"power zero to negative", "power", []float64{0, -1}, ErrResultNotFinite},
		{"power negative base fractional exponent", "power", []float64{-8, 0.5}, ErrResultNotFinite},
		{"percentage overflow", "percentage", []float64{1e308, 1e10}, ErrResultNotFinite},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.operands)
			if !errors.Is(err, tt.want) {
				t.Fatalf("Calculate(%q, %v) = (%v, %v), want error %v", tt.op, tt.operands, got, err, tt.want)
			}
		})
	}
}
