package httpapi

import (
	"context"
	"log/slog"
)

// Caps on what one calculation log line may contain. Request bodies are
// untrusted and may be up to 1 MB, so an absurd operation name, operand list or
// echoed field name must not turn into a 1 MB log line. Valid requests are far
// below these limits.
const (
	maxLoggedOperationBytes = 64
	maxLoggedOperands       = 16
	maxLoggedMessageBytes   = 256
)

// logCalculation writes one JSON line for a calculation request: the operation
// and operands that were received (each omitted if absent) and the outcome,
// either a "result" or an "error" group. The JSON handler escapes every string,
// so request values cannot break out of their line.
func logCalculation(l *slog.Logger, req calculationRequest, outcome slog.Attr) {
	attrs := make([]slog.Attr, 0, 4)
	if req.Operation != "" {
		attrs = append(attrs, slog.String("operation", truncate(req.Operation, maxLoggedOperationBytes)))
	}
	if req.Operands != nil {
		// []*float64 so a null element is logged as null, not as an invented 0.
		attrs = append(attrs, slog.Any("operands", req.Operands[:min(len(req.Operands), maxLoggedOperands)]))
		if len(req.Operands) > maxLoggedOperands {
			attrs = append(attrs, slog.Int("operand_count", len(req.Operands)))
		}
	}
	l.LogAttrs(context.Background(), slog.LevelInfo, "calculation", append(attrs, outcome)...)
}

// truncate cuts s to at most n bytes and marks the cut with "...". A cut inside
// a multi-byte character is written by slog as U+FFFD.
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
