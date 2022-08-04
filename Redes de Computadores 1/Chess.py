board = []
board += [['t','c','b','k','q','b','c','t']]
board += [['p' for _ in range(8)]]
board += [[' ' for _ in range(8)] for x in range(4)]
board += [['P' for _ in range(8)]]
board += [['T','C','B','K','Q','B','C','T']]

class Piece():
    def __init__(self, board, position, move_style, move_magnitude, can_cross):
        self.board = board
        self.position = position
        self.move_style = move_style #Front, Diagonal, Cross, Diamond, Absolute
        self.move_magnitude = move_magnitude #Queen=8 but King=1 moving around
        self.can_cross = can_cross #The knight can cross pieces, but the others can't

    def AvailableMovingCells():
        pass

    def AvailableCapturingCells():
        pass

class Board():
    def __init__(self):
        self.cells = [[None for _a in range(8)] for _b in range(8)]
        self.cells[5][3] = Piece(self, (4,6), 'cross', 8, False)
    def display(self):
        for row in self.cells:
            visible_row = [('.' if row[x] is None else 'k') for x in range(len(row))]
            print(visible_row)
            

b = Board()
b.display()