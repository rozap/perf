defmodule Perf.Runner.RequestTracker do
  alias Experimental.GenStage
  alias Perf.{Suite, User, Run}
  alias Perf.Suite.Request
  use GenStage
  require Logger

  def start_link(run) do
    GenStage.start_link(__MODULE__, run)
  end

  def init(run) do
    {:producer_consumer, %{run: run}}
  end

  def handle_events(events, _, state) do
    Enum.each(events, fn e -> Logger.debug("RequestTracker got an event #{inspect e}") end)

    {:noreply, events, state}
  end

end