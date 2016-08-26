defmodule Perf.Runner.Consumer do
  alias Experimental.GenStage
  use GenStage
  require Logger
  alias Perf.Runner.Coordinator
  alias Perf.Yams.Handle

  def start_link(yams, run) do
    GenStage.start_link(__MODULE__, [yams, run])
  end

  def init([yams, run]) do
    Logger.debug("Consumer started on #{inspect run}")
    Process.monitor(yams)
    {:consumer, %{yams: yams, result: %{}, meta_refs: MapSet.new}}
  end

  # defp on_event(%Done{}) do

  # end

  defp record(events, state) do
    Enum.each(events, fn event ->
      case state.yams do
        :none ->
          Logger.warn("Consumer got #{inspect event} but yams is dead?")
        handle ->
          Handle.put(handle, event.at, event)
      end
    end)
  end

  def handle_info({:DOWN, yams, _, _, _}, %{yams: yams} = state) do
    {:noreply, [], Map.put(state, :yams, :none)}
  end

  def handle_info({_, {:broadcast, event}}, %{meta_refs: refs} = state) do
    new_state = if !MapSet.member?(refs, event.ref) do
      record([event], state)
      %{state | meta_refs: MapSet.put(refs, event.ref)}
    else
      state
    end
    {:noreply, [], new_state}
  end

  def handle_info(_, state) do
    {:noreply, [], state}
  end

  def handle_events(events, _, state) do
    record(events, state)
    {:noreply, [], state}
  end

  def handle_call({:complete, result}, _, state) do
    {:noreply, [result], state}
  end

end