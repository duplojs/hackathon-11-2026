package b

import "research/either/inspect"

func Add04(one, two float64) Either {
	if one == -1 {
		return Fail()
	}
	return Success(one + two)
}

func Add(one, two float64) Either {
	if one < 0 || two < 0 {
		var operand float64
		if one < 0 {
			operand = one
		} else {
			operand = two
		}
		return NewLeft("negative-operand", operand)
	}
	return Success(one + two)
}

//go:noinline
func AddNoInline(one, two float64) Either {
	return Add(one, two)
}

func Divide(value, divisor float64) Either {
	if divisor == 0 {
		return NewLeft("division-by-zero", divisor)
	}
	return Success(value / divisor)
}

func Calculate(one, two, divisor float64) Either {
	step := Add(one, two)
	right, ok := step.(Right[float64])
	if !ok {
		return step
	}
	return Divide(right.Value, divisor)
}

func Message(result Either) string {
	switch v := result.(type) {
	case Right[float64]:
		return inspect.ToString(v.Value)
	case Left[float64]:
		switch v.Information {
		case "negative-operand":
			return "un opérande est négatif"
		case "division-by-zero":
			return "division par zéro impossible"
		}
	}
	panic("b.Message: variante non prévue")
}

func Code(result Either) float64 {
	switch v := result.(type) {
	case Right[float64]:
		return v.Value
	case Left[float64]:
		if v.Information == "negative-operand" {
			return -1
		}
		return -2
	}
	return 0
}

func MapCalculate(inputs [][3]float64) []Either {
	results := make([]Either, len(inputs))
	for index, input := range inputs {
		results[index] = Calculate(input[0], input[1], input[2])
	}
	return results
}

func Group(items []Either) Either {
	values := make([]float64, len(items))
	for index, item := range items {
		right, ok := item.(Right[float64])
		if !ok {
			return item
		}
		values[index] = right.Value
	}
	return Success(values)
}
