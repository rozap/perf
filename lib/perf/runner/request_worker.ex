defmodule Perf.Runner.RequestWorker do
  alias Experimental.GenStage
  use GenStage
  require Logger

  def start_link(_) do
    GenStage.start_link(__MODULE__, [])
  end

  def init(_) do
    {:producer_consumer, %{}}
  end

  def handle_events(events, _, state) do
    
    {:noreply, events, state}
  end

  def stop(pid) do
    :poolboy.checkin(RequestWorker, pid) 
  end

end