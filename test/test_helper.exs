defmodule Perf.TestHelpers do
  alias Phoenix.Socket.Reply

  def wait_for(ref) do
    receive do
      %Reply{payload: p, ref: ^ref} -> p
    end
  end
end

ExUnit.start(timeout: 5_000)
Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, :manual)

