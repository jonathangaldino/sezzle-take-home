// Package calculator contains the calculator's domain logic, independent of
// HTTP and JSON.
//
// All arithmetic uses IEEE 754 float64. That is a pragmatic choice for a
// general-purpose calculator, but it means values such as 0.1 are not
// represented exactly (0.1 + 0.2 = 0.30000000000000004). This package is not
// suitable for financial or other decimal-exact calculations; those need a
// decimal type.
package calculator
