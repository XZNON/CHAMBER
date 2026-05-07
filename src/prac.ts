class ListNode<T> {
  public value: T;
  public next: ListNode<T> | null = null;

  constructor(value: T) {
    this.value = value;
  }
}

class LinkedList<T> {
  private head: ListNode<T> | null = null;
  private size: number = 0;

  append(value: T): void {
    const newNode = new ListNode(value);

    if (!this.head) {
      this.head = newNode;
    } else {
      let current = this.head;
      while (current.next) {
        current = current.next;
      }
      current.next = newNode;
    }
    this.size++;
  }

  print(): void {
    let current = this.head;
    const elements: T[] = [];
    while (current) {
      elements.push(current.value);
      current = current.next;
    }
    console.log(elements.join("->"));
  }

  delete(): void {
    if (!this.head) {
      return;
    }

    if (!this.head.next) {
      this.head = null;
      this.size = 0;
      return;
    }

    let current = this.head;
    while (current.next && current.next.next) {
      current = current.next;
    }
    current.next = null;
    this.size--;
    console.log("deleted last node hue hue hue");
  }

  getSize(): number {
    return this.size;
  }

  rotate(k: number): void {
    if (!this.head || k === 0 || !this.head.next) return;

    let tail = this.head;
    let length = 1;
    while (tail.next) {
      tail = tail.next;
      length++;
    }

    k = k % length;
    if (k === 0) return;

    tail.next = this.head;

    let newTail = this.head;
    for (let i = 0; i < length - k - 1; i++) {
      newTail = newTail.next!;
    }

    this.head = newTail.next;
    newTail.next = null;

    console.log(`Rotated by ${k} steps`);
  }
}

const list = new LinkedList<number>();

list.append(10);
list.append(20);
list.append(30);

list.print(); // Output: 10 -> 20 -> 30
console.log("Size:", list.getSize()); // Output: Size: 3
