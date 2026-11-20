// Problématique 11 : objets et accès aux propriétés (stratégie proposée, non implémentée).
// Exécution : go run ./11-objets-et-proprietes/exemples
package main

import "fmt"

// Chaque type objet devient une struct : champs compacts, lecture directe.
type User struct {
	Name string
	Age  float64
}

type Product struct {
	Name  string
	Price float64
}

// Accesseurs générés pour les champs lus à travers une union ou un any.
// Récepteur pointeur : les objets sont partagés, comme en JavaScript.
func (user *User) GetName() string       { return user.Name }
func (product *Product) GetName() string { return product.Name }

// L'interface ne demande que la méthode utile : c'est l'assertion partielle
// que Go refuse sur une struct anonyme.
type hasName interface{ GetName() string }

// label(item: User | Product) : l'item arrive en any, on lit name par l'accesseur.
func label(item any) string {
	return item.(hasName).GetName()
}

// rename modifie l'objet de l'appelant : le paramètre est un pointeur.
func rename(user *User) {
	user.Name = "Ada"
}

func main() {
	user := &User{Name: "Grace", Age: 36}
	product := &Product{Name: "Clavier", Price: 49}

	fmt.Println(label(user))    // Grace
	fmt.Println(label(product)) // Clavier

	rename(user)
	fmt.Println(user.Name) // Ada

	// Vérification de la piste écartée : l'assertion partielle sur une struct anonyme échoue.
	var item any = User{Name: "Grace", Age: 36}
	_, ok := item.(struct{ Name string })
	fmt.Println("assertion sur struct anonyme :", ok) // false
}
