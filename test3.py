import sys

def greet(name):
    print(f"Hello, {name}!")

def add(a, b):
    print(f"{a} + {b} = {a + b}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "-p" and len(sys.argv) > 2:
            greet(sys.argv[2])
        elif sys.argv[1] == "add" and len(sys.argv) > 3:
            try:
                a = int(sys.argv[2])
                b = int(sys.argv[3])
                add(a, b)
            except ValueError:
                print("Please provide two integers for addition.")
        else:
            print("Usage: python3 test3.py -p <name> OR python3 test3.py add <a> <b>")
    else:
        print("Usage: python3 test3.py -p <name> OR python3 test3.py add <a> <b>")
