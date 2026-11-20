package tuples

import "testing"

const tupleCount = 1000

var (
	sliceSink float64
	arraySink float64
)

func makeSliceInputs() [][]float64 {
	inputs := make([][]float64, tupleCount)

	for index := range inputs {
		inputs[index] = []float64{
			float64(index % 17),
			float64(index % 13),
			float64(index%7 + 1),
		}
	}

	return inputs
}

func makeArrayInputs() [][3]float64 {
	inputs := make([][3]float64, tupleCount)

	for index := range inputs {
		inputs[index] = [3]float64{
			float64(index % 17),
			float64(index % 13),
			float64(index%7 + 1),
		}
	}

	return inputs
}

func calculateSlices(inputs [][]float64) float64 {
	var total float64

	for _, tuple := range inputs {
		one := tuple[0]
		two := tuple[1]
		divisor := tuple[2]
		total += (one + two) / divisor
	}

	return total
}

func calculateArrays(inputs [][3]float64) float64 {
	var total float64

	for _, tuple := range inputs {
		one := tuple[0]
		two := tuple[1]
		divisor := tuple[2]
		total += (one + two) / divisor
	}

	return total
}

func TestRepresentationsMatch(t *testing.T) {
	sliceResult := calculateSlices(makeSliceInputs())
	arrayResult := calculateArrays(makeArrayInputs())

	if sliceResult != arrayResult {
		t.Fatalf("slice result %v differs from array result %v", sliceResult, arrayResult)
	}
}

func BenchmarkSliceTriplets1000(b *testing.B) {
	for iteration := 0; iteration < b.N; iteration++ {
		sliceSink = calculateSlices(makeSliceInputs())
	}
}

func BenchmarkArrayTriplets1000(b *testing.B) {
	for iteration := 0; iteration < b.N; iteration++ {
		arraySink = calculateArrays(makeArrayInputs())
	}
}
