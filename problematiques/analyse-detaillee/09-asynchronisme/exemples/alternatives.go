package main

import (
	"fmt"
	"sync"
	"sync/atomic"
)

// ---------------------------------------------------------------------------
// Piste « vision long terme » : boucle d'événements + machine à états.
//
// Chaque `await` coupe la fonction en deux : la suite (« continuation ») est
// placée dans une file, comme les microtâches de JavaScript. Une boucle vide
// la file dans l'ordre. C'est ce que font les compilateurs C# ou Babel
// (regenerator) : la fonction async devient une machine à états.
// ---------------------------------------------------------------------------

type eventLoop struct {
	microtasks []func()
}

func (loop *eventLoop) enqueue(continuation func()) {
	loop.microtasks = append(loop.microtasks, continuation)
}

func (loop *eventLoop) run() {
	for len(loop.microtasks) > 0 {
		next := loop.microtasks[0]
		loop.microtasks = loop.microtasks[1:]
		next()
	}
}

// Traduction de :
//
//	async function task(name) { for (const step of [1, 2]) { log(name, step); await null; } }
func startTask(loop *eventLoop, name string) {
	steps := []int{1, 2}
	var resume func(index int)
	resume = func(index int) {
		if index >= len(steps) {
			return // la promesse est résolue
		}
		fmt.Println(name, steps[index])
		loop.enqueue(func() { resume(index + 1) }) // `await null`
	}
	resume(0) // le corps s'exécute de façon synchrone jusqu'au premier await
}

func runInterleavedTasks() {
	loop := &eventLoop{}
	startTask(loop, "A") // const first = task("A")
	startTask(loop, "B") // const second = task("B")
	loop.run()           // await first; await second
}

// ---------------------------------------------------------------------------
// Piste ÉCARTÉE pour asyncGroup : une goroutine par getter.
//
// Tentant (vrai parallélisme), mais la sémantique CHANGE : DuploJS appelle
// les getters un par un et n'appelle pas ceux qui suivent un échec. Ici, les
// trois sont exécutés, et leurs effets de bord auraient lieu dans un ordre
// non déterministe.
// ---------------------------------------------------------------------------

func runParallelGroup() {
	var executed atomic.Int32
	inputs := [3][2]float64{{6, 3}, {1, 0}, {8, 2}}
	var results [3]Result
	var waitGroup sync.WaitGroup

	for index, input := range inputs {
		waitGroup.Go(func() {
			executed.Add(1)
			results[index] = divide(input[0], input[1])
		})
	}
	waitGroup.Wait()

	// Le premier échec dans l'ORDRE des entrées est conservé : le résultat est
	// le même, mais tous les calculs ont été faits.
	failed := false
	for _, result := range results {
		if result.Tag == isLeft {
			failed = true
			break
		}
	}
	fmt.Println("annulée :", failed, "- getters exécutés :", executed.Load(), "(DuploJS : 2)")
}
