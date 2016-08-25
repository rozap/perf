defmodule Perf.Runner.RequestTracker do
  alias Experimental.GenStage
  alias Perf.{Suite, User, Run}
  alias Perf.Suite.Request
  alias Perf.Runner.Events.{Result, Error, Success}
  use GenStage
  require Logger

  @threshold 16

  defmodule Stats do
    defstruct errors: [],
      successes: []
  end

  def start_link(run) do
    GenStage.start_link(__MODULE__, run)
  end

  def init(run) do
    {:producer_consumer, %Stats{}}
  end

  defp flush(state, extras \\ []) do
    events = (state.errors ++ state.successes)
    |> Enum.sort_by(fn ev -> ev.at end)

    new_state = struct(state, successes: [], errors: [])

    events = case extras do
      [] -> events
      _ -> events ++ extras
    end

    {events, new_state}
  end

  defp maybe_flush(%Stats{errors: errors} = state) when length(errors) > @threshold do
    flush(state)
  end
  defp maybe_flush(%Stats{successes: successes} = state) when length(successes) > @threshold do
    flush(state)
  end
  defp maybe_flush(state), do: {[], state}

  defp on_event(%Result{success: false, reason: reason} = r, state) do
    e = %Error{
      reason: reason,
      status: r.status,
      at: r.end_t
    }
    struct(state, errors: [e | state.errors])
    |> maybe_flush
  end

  defp on_event(%Result{success: true} = r, state) do
    latency = r.end_t - r.start_t
    s = %Success{
      at: r.end_t,
      latency: latency,
      throughput: (r.size / latency)
    }
    struct(state, successes: [s | state.successes])
    |> maybe_flush
  end

  defp on_event(:done, state) do
    flush(state, [:done])
  end

  defp on_event(event, state), do: {[event], state}

  def handle_events(events, _, state) do
    {results, %Stats{} = state} = Enum.reduce(events, {[], state}, fn event, {events, state} ->
      {more_events, new_state} = on_event(event, state)
      {[more_events | events], new_state}
    end)
    {:noreply, List.flatten(results), state}
  end

  def handle_info({ref, {:broadcast, event}}, state) do
    GenStage.async_notify(self, {:broadcast, event})
    {:noreply, [], state}
  end

  def handle_info(_, state) do
    {:noreply, [], state}
  end

end