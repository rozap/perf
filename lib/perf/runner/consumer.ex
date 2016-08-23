defmodule Perf.Runner.Consumer do
  alias Experimental.GenStage
  use GenStage
  require Logger
  alias Perf.Runner.Coordinator

  def start_link do
    GenStage.start_link(__MODULE__, [])
  end

  def init(state) do
    {:consumer, state}
  end

  def handle_events(events, _, state) do
    Logger.debug("Consumer got #{inspect events}")

    {:noreply, [], state}
  end

  def handle_call({:complete, result}, _, state) do
    {:noreply, [result], state}
  end

end