"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import db from "@/lib/client";
import {
  collection,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Home() {
  const [tables, setTables] = useState([]);
  const [items, setItems] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [selectedItems, setSelectedItems] = useState<any>({});
  const [total, setTotal] = useState(0);
  const [activeOrders, setActiveOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
      const ordersData = snapshot.docs
        .map((doc) => doc.data())
        .filter((order) => order.isActive);
      setActiveOrders(ordersData as any);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribeTables = onSnapshot(
      collection(db, "tables"),
      (snapshot) => {
        const tablesData = snapshot.docs.map((doc) => doc.data());
        setTables(tablesData as any);
      }
    );

    const unsubscribeItems = onSnapshot(collection(db, "items"), (snapshot) => {
      const itemsData = snapshot.docs.map((doc) => doc.data());
      setItems(itemsData as any);
    });

    const unsubscribeWaiters = onSnapshot(
      collection(db, "waiters"),
      (snapshot) => {
        const waitersData = snapshot.docs.map((doc) => doc.data());
        setWaiters(waitersData as any);
      }
    );

    const unsubscribeCategories = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const categoriesData = snapshot.docs.map((doc) => doc.data());
        setCategories(categoriesData as any);
      }
    );

    // Clean up the subscriptions when the component unmounts
    return () => {
      unsubscribeTables();
      unsubscribeItems();
      unsubscribeWaiters();
      unsubscribeCategories();
    };
  }, []);

  const handleItemSelectionChange = (
    itemName: any,
    isChecked: any,
    isIncrement: boolean
  ) => {
    setSelectedItems((prev: any) => {
      const newSelectedItems = { ...prev };
      if (isIncrement) {
        if (newSelectedItems[itemName]) {
          newSelectedItems[itemName] += 1; // Increment the count
        } else {
          newSelectedItems[itemName] = 1; // Add the item with a count of 1
        }
      } else if (newSelectedItems[itemName] && newSelectedItems[itemName] > 0) {
        newSelectedItems[itemName] -= 1; // Decrement the count
        if (newSelectedItems[itemName] === 0) {
          delete newSelectedItems[itemName]; // Remove the item if count reaches 0
        }
      }

      // Calculate the new total
      const newTotal = typedItems.reduce((acc, item) => {
        const itemCount = newSelectedItems[item["Nombre del Platillo"]] || 0;
        return acc + itemCount * Number(item.Precio);
      }, 0);

      setTotal(newTotal);
      return newSelectedItems;
    });
  };

  const [searchQuery, setSearchQuery] = useState("");

  // Filter items based on the search query
  const typedItems = items as {
    "Nombre del Platillo": string;
    Precio: number;
    Imágen: string;
    Descripción: string;
    Categoría: string;
  }[];

  const filteredItems = typedItems.filter((item) =>
    item["Nombre del Platillo"]
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const ordersCollectionRef = collection(db, "orders");
    const formData = new FormData(e.target);

    const ordersSnapshot = await getDocs(ordersCollectionRef);
    const newOrderId = ordersSnapshot.docs.length + 1; // This might not be safe for concurrency reasons

    // Create a reference to the new order with a custom ID
    const newOrderRef = doc(db, "orders", newOrderId.toString());

    const order = {
      id: newOrderId,
      waiter: formData.get("waiter"),
      table: formData.get("table"),
      items: selectedItems, // Assuming selectedItems is correctly managed elsewhere
      paymentMethod: formData.get("paymentMethod"),
      orderedAt: new Date().toLocaleString("es-MX", {
        timeZone: "America/Mexico_City",
      }),
      total: total,
      isActive: true,
      notes: notes,
    };

    if (
      !order.waiter ||
      !order.table ||
      !order.paymentMethod ||
      !order.items ||
      !order.total ||
      !order.isActive ||
      !order.orderedAt ||
      !order.id
    ) {
      toast.error("Por favor, rellena todos los campos");
      return;
    }

    try {
      await setDoc(newOrderRef, order);
      toast.success("Pedido tomado con éxito");
      // reset form and state
      e.target.reset();
      setSelectedItems([]);
      setTotal(0);
      setNotes("");
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const [currentOrder, setCurrentOrder] = useState<any>();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "orders"), (snapshot) => {
      const ordersData = snapshot.docs
        .map((doc) => doc.data())
        .filter((order) => order.isActive);
      setActiveOrders(ordersData as any);
    });

    return () => unsubscribe();
  }, []);

  const handleMarkOrderInactive = async () => {
    if (!currentOrder) return;
    const orderRef = doc(db, "orders", currentOrder?.id.toString());
    await updateDoc(orderRef, {
      isActive: false,
    });
    setCurrentOrder(null);
  };

  const itemsGroupedByCategory: { [key: string]: any[] } = filteredItems.reduce(
    (acc: any, item) => {
      const category: any = item.Categoría;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {}
  );

  return (
    <main className="flex flex-col justify-center items-center gap-10 p-14">
      <Image src="/huevosdias.jpg" alt="Logo" width={350} height={350} />

      <section className="flex flex-col items-center space-y-4">
        <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
          {/* Waiter selection */}
          <select
            name="waiter"
            id="waiter"
            className="bg-white rounded-md py-2"
          >
            <option value="">Selecciona el Meser@</option>
            {waiters.map((waiter: any, index) => (
              <option key={index} value={waiter.Nombre}>
                {waiter.Nombre}
              </option>
            ))}
          </select>

          {/* Table selection */}
          <select name="table" id="table" className="bg-white rounded-md py-2">
            <option value="">Selecciona la Mesa</option>
            {tables.map((table, index) => (
              <option key={index} value={table["Número de mesa"]}>
                {table["Número de mesa"]}
              </option>
            ))}
          </select>

          {/* Items selection dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Buscar platillos</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Seleccione los platillos</DialogTitle>
              </DialogHeader>
              <Input
                type="text"
                placeholder="Buscar platillos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4 p-2 border rounded w-full"
              />
              <div className="overflow-y-auto max-h-60">
                {Object.keys(itemsGroupedByCategory).length > 0 ? (
                  Object.entries(itemsGroupedByCategory).map(
                    ([categoryName, items]) => (
                      <div key={categoryName}>
                        <h3 className="text-xl font-bold mt-4 mb-2">
                          {categoryName}
                        </h3>
                        {items.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center mb-2 p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <div className="flex items-center">
                              <img
                                src={item["Imágen"]}
                                alt={item["Nombre del Platillo"]}
                                className="mr-4 rounded-md object-cover w-16 h-16"
                              />
                              <div className="flex flex-col ">
                                <span className="font-semibold">
                                  {item["Nombre del Platillo"]}
                                </span>
                                <span className="text-sm text-gray-500">
                                  ${item.Precio}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {item.Descripción}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Button
                                className="px-2 py-1 mx-2"
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  handleItemSelectionChange(
                                    item["Nombre del Platillo"],
                                    false,
                                    false
                                  )
                                }
                              >
                                -
                              </Button>
                              <span className="mx-2">
                                {selectedItems[item["Nombre del Platillo"]] ||
                                  0}
                              </span>
                              <Button
                                className="px-2 py-1 mx-2"
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  handleItemSelectionChange(
                                    item["Nombre del Platillo"],
                                    true,
                                    true
                                  )
                                }
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )
                ) : (
                  <p className="text-center mt-2">
                    No se encontraron platillos.
                  </p>
                )}
              </div>
              <div className="mt-4">
                <Input
                  type="text"
                  name="notes"
                  placeholder="Notas"
                  className="w-full"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <DialogClose asChild>
                <Button variant="default" className="mt-4 w-full py-2">
                  Aceptar
                </Button>
              </DialogClose>
            </DialogContent>
          </Dialog>

          {/* Payment method selection */}
          <select
            name="paymentMethod"
            id="paymentMethod"
            className="bg-white rounded-md py-2"
          >
            <option value="">Método de Pago</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
          </select>

          <p className="text-4xl tracking-tight font-semibold">$ {total}</p>
          <Button type="submit" className="w-full">
            Tomar pedido
          </Button>
        </form>

        {/* Active orders section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Pedidos activos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrders.map((order: any, index) => (
              <Card className="bg-white rounded-md shadow-md p-4 " key={index}>
                <CardHeader>
                  <CardTitle>Mesa: {order.table}</CardTitle>
                  <CardDescription>Meser@: {order.waiter}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>
                    Platillos:{" "}
                    {Object.keys(order.items)
                      .map((key) => `${key} x${order.items[key]}`)
                      .join(", ")}
                  </p>
                  <p>Método de Pago: {order.paymentMethod}</p>
                  <p>Total: ${order.total}</p>
                </CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button onClick={() => setCurrentOrder(order)}>
                        Marcar como pagado
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>¿Estás seguro?</DialogTitle>
                        <DialogDescription>
                          Esta acción no se puede deshacer. Esto marcará el
                          pedido como pagado.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogClose asChild>
                        <Button
                          variant={"outline"}
                          onClick={handleMarkOrderInactive}
                        >
                          Confirmar
                        </Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button variant={"destructive"}>Cancelar</Button>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
