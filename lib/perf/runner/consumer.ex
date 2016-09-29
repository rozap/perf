defmodule Perf.Runner.Consumer do
  alias Experimental.GenStage
  use GenStage
  require Logger
  alias Perf.Runner.Events
  alias Yams.Session
  @buf_size 100

  def start_link(yams, run) do
    GenStage.start_link(__MODULE__, [yams, run])
  end

  def init([yams, run]) do
    Logger.warn("Consumer started on #{inspect run.suite.name} #{inspect yams}")
    Process.link(yams)
    {:consumer, %{yams: yams, buf: [], meta_refs: MapSet.new}}
  end

  defp record(event, %{yams: :none} = s) do
    %{s | buf: Enum.take([event | s.buf], @buf_size)}
  end

  defp record(event, %{yams: yam} = state) do
    Session.put(yam, Events.timeof(event), Events.to_row(event))
    state
  end

  def handle_cast({:event, event}, state) do
    new_state = record(event, state)
    {:noreply, [], new_state}
  end

  def on_event(consumer, event) do
    GenStage.cast(consumer, {:event, event})
  end

end