defmodule Perf.TestHelpers do
  alias Phoenix.Socket.Reply

  def wait_for(ref) do
    receive do
      %Reply{payload: p, ref: ^ref} -> p
    end
  end
end

ExUnit.start
Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, :manual)

