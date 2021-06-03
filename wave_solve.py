import numpy as np
import matplotlib.pyplot as plt


class WaveSolve:
    def __init__(self, c, dt, dx, dy, b = 0.00):
        r = (np.max(c)*dt)/min(dx,dy)
        assert(r<= 1)
        self.dt = dt
        second_derivative = lambda x, dx: (x[2:] - 2*x[1:-1] + x[:-2])/dx**2
        ##I Did some whaky as shit to do the derivative, thats transpose of the transpose...
        laplacian = lambda x: second_derivative(x[:,1:-1], dx) + second_derivative(x.T[:,1:-1], dy).T
        #self.make_diff = lambda x: (U*r**2*(x[2:,1:-1]+ x[:-2,1:-1] + x[1:-1,2:] + x[1:-1,:-2]) + 2*(1-2*r**2)*x[1:-1, 1:-1]) 
        make_coeff = lambda xx: (xx/dt**2) + (b/dt)
        self.coeff = make_coeff(1)
        self.make_diff = lambda x: (1/self.coeff)*(c[1:-1,1:-1]**2*laplacian(x) + x[1:-1,1:-1]*make_coeff(2))
    def create_grid(self,L, f, g):
        grid = np.zeros((3,L,L))
        grid[0,:,:] = -self.dt*g
        grid[1,:,:] = f
        self.grid = grid      
    def first_step(self):
        #should be 0.5*self.make......
        self.grid[2,1:-1,1:-1] = 0.5*self.make_diff(self.grid[1,...]) - (1/self.coeff)*(1/self.dt**2)*self.grid[0,1:-1, 1:-1]
        self.grid[0,...] = self.grid[1,...]
        self.grid[1,...] = self.grid[2,...]
    def step_soln(self):
        self.grid[2,1:-1, 1:-1] = (self.make_diff(self.grid[1,...]) - (1/self.coeff)*(1/self.dt**2)*self.grid[0,1:-1, 1:-1])
        self.grid[0,...] = self.grid[1,...]
        self.grid[1,...] = self.grid[2,...]

    def plot_place(self):
        plt.ion()
        plt.clf()
        plt.imshow(self.grid[2,...], vmin=-1, vmax=1)
        plt.colorbar()
        plt.show()
        plt.pause(0.04)
    def solve_steps(self, num_steps):
        self.first_step()
        self.plot_place()
        for _ in range(num_steps):
            self.step_soln()
            if _%20==0:
                self.plot_place()



L = 100
f = np.zeros((L,L))
z = np.hanning(8)
c = np.ones((L,L))*2
c[:,:L//3] = 20
f[L//2-4: L//2+4,L//2-4: L//2+4] = 2
# f[L//2,L//2] = 1
# f[L//2] = 0.01
g = np.zeros((L,L))
w = WaveSolve(c,0.001,0.5,0.5)
w.create_grid(L,f,g)
# w.step_soln()
# w.plot_place()

w.solve_steps(4000)


