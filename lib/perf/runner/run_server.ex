defmodule Perf.Runner.RunServer do
  use GenServer
  alias Perf.Runner
  require Logger

  def start_link do
    GenServer.start_link(__MODULE__, [], [name: __MODULE__])
  end

  def init do
    {:ok, %{}}
  end

  def handle_call({:new, run}, _from, state) do
    {_pid, _ref} = spawn_monitor(Runner, :execute, [run])

    {:reply, :ok, state}
  end

  def handle_info({:'DOWN', _ref, :process, pid, reason}, state) do
    Logger.info("Run execution #{inspect pid} has finished #{inspect reason}")
    {:noreply, state}
  end

  def new(run) do
    GenServer.call(__MODULE__, {:new, run})
  end
end