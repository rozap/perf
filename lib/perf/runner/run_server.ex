defmodule Perf.Runner.RunServer do
  use GenServer
  alias Perf.{Runner, Run}
  require Logger

  def start_link do
    GenServer.start_link(__MODULE__, [], [name: __MODULE__])
  end

  def init(_) do
    {:ok, %{
      in_progress: []
    }}
  end

  def handle_call({:new, run}, _from, state) do
    {pid, ref} = spawn_monitor(Runner, :execute, [run])

    in_progress = [{run, pid, ref} | state.in_progress]
    new_state = %{state | in_progress: in_progress}
    
    {:reply, :ok, new_state}
  end

  defp pop_progress(in_progress, pid, ref) do
    {[{run, _, _}], others} = Enum.partition(in_progress, fn 
      {_run, ^pid, ^ref} -> true
      _ -> false
    end)

    {run, others}
  end

  def handle_info({:'DOWN', ref, :process, pid, :normal}, state) do
    {run, in_progress} = pop_progress(state.in_progress, pid, ref)
    Logger.info("Run execution #{inspect pid} has finished successfully")

    # Run.write_succeeded!(run)

    new_state = %{state | in_progress: in_progress}
    {:noreply, new_state}
  end

  def handle_info({:'DOWN', ref, :process, pid, reason}, state) do
    {run, in_progress} = pop_progress(state.in_progress, pid, ref)
    Logger.warn("Run execution #{inspect pid} has failed #{inspect reason}")

    Run.write_failed!(run, reason, "foo")

    new_state = %{state | in_progress: in_progress}
    {:noreply, new_state}
  end


  def new(run) do
    GenServer.call(__MODULE__, {:new, run})
  end
end