package shard_dependencies

type JSNull struct {}

func (_ JSNull) MarshalJSON() ([]byte, error) {
	return ([]byte)("null"), nil
}

type JSUndefined struct {}

func (_ JSUndefined) MarshalJSON() ([]byte, error) {
	return ([]byte)("null"), nil
}

func (_ JSUndefined) IsZero() (bool) {
	return true
}
